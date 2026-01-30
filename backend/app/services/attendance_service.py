"""
Attendance Service
Handles attendance operations: password-based and face recognition-based check-in/check-out
"""
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from utils.db import get_db_connection, get_db_cursor
from utils.logger import logger
from services.auth_service import AuthService
from services.recognition_service import verify_face, find_best_match
from services.detection_service import detect_faces_from_base64, get_face_detector
from utils.image_utils import decode_base64_image


class AttendanceService:
    """Service for attendance operations"""
    
    @staticmethod
    def create_attendance(user_id: int, method: str, presence: str, face_confidence: Optional[float] = None) -> Tuple[bool, str, Optional[int]]:
        """
        Create attendance record
        
        Args:
            user_id: User ID
            method: Attendance method (password, face-one, face-all, face-multi)
            presence: Type of presence (incoming/outcoming)
            face_confidence: Face match confidence (optional, for face methods)
            
        Returns:
            (success, message, attendance_id)
        """
        try:
            with get_db_connection() as conn:
                cursor = get_db_cursor(conn)
                
                cursor.execute("""
                    INSERT INTO attendance (user_id, method, face_confidence, presence, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (user_id, method, face_confidence, presence, datetime.now()))
                
                result = cursor.fetchone()
                attendance_id = result['id']
                conn.commit()
                
                logger.info(f"Attendance created: ID={attendance_id}, User={user_id}, Method={method}, Presence={presence}")
                return True, "Attendance recorded successfully", attendance_id
            
        except Exception as e:
            logger.error(f"Error creating attendance: {str(e)}")
            return False, f"Failed to record attendance: {str(e)}", None
    
    @staticmethod
    def can_record_attendance(user_id: int, hours: int = 2) -> bool:
        """
        Check if user can record attendance (not within last N hours)
        
        Args:
            user_id: User ID
            hours: Minimum hours between attendance records
            
        Returns:
            True if can record, False otherwise
        """
        try:
            with get_db_connection() as conn:
                cursor = get_db_cursor(conn)
                cursor.execute("""
                    SELECT created_at
                    FROM attendance
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT 1
                """, (user_id,))
                
                result = cursor.fetchone()
                
                if not result:
                    return True  # No previous attendance
                
                last_attendance = result['created_at']
                time_diff = datetime.now() - last_attendance
                
                # Check if difference is greater than specified hours
                return time_diff.total_seconds() >= (hours * 3600)
                
        except Exception as e:
            logger.error(f"Error checking attendance eligibility: {str(e)}")
            return True  # Allow on error to not block users
    
    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        """
        Get user by email
        
        Args:
            email: User email
            
        Returns:
            User data or None
        """
        try:
            with get_db_connection() as conn:
                cursor = get_db_cursor(conn)
                cursor.execute("""
                    SELECT id, name, email, password
                    FROM users
                    WHERE email = %s
                """, (email,))
                
                result = cursor.fetchone()
                if result:
                    return {
                        'id': result['id'],
                        'name': result['name'],
                        'email': result['email'],
                        'password': result['password']
                    }
                return None
                
        except Exception as e:
            logger.error(f"Error getting user by email: {str(e)}")
            return None
    
    @staticmethod
    def attendance_password(email: str, password: str, presence: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Record attendance using email and password
        
        Args:
            email: User email
            password: User password
            presence: Type of presence (incoming/outcoming)
            
        Returns:
            (success, message, attendance_data)
        """
        try:
            # Verify user credentials
            user = AttendanceService.get_user_by_email(email)
            
            if not user:
                return False, "User not found", None
            
            # Verify password
            if not AuthService.verify_password(password, user['password']):
                return False, "Invalid password", None
            
            # Create attendance record
            success, message, attendance_id = AttendanceService.create_attendance(
                user_id=user['id'],
                method='password',
                presence=presence,
                face_confidence=None
            )
            
            if not success:
                return False, message, None
            
            return True, f"Attendance recorded for {user['name']}", {
                'attendance_id': attendance_id,
                'user_id': user['id'],
                'user_name': user['name'],
                'user_email': user['email'],
                'method': 'password',
                'presence': presence,
                'created_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in attendance_password: {str(e)}")
            return False, f"Attendance failed: {str(e)}", None
    
    @staticmethod
    def attendance_face_one(user_id: int, image_base64: str, presence: str, threshold: float = 0.6) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Record attendance using face recognition (1:1 verification)
        Verify that the captured face matches the specified user
        
        Args:
            user_id: User ID to verify against
            image_base64: Base64 encoded image
            presence: Type of presence (incoming/outcoming)
            threshold: Face match threshold
            
        Returns:
            (success, message, attendance_data)
        """
        try:
            # Decode image
            image = decode_base64_image(image_base64)
            
            # Verify face against user (returns match, confidence)
            match, confidence = verify_face(user_id, image, threshold)
            
            if not match:
                return False, f"Face verification failed. Confidence: {confidence:.2f}, Threshold: {threshold}", None
            
            # Get user details
            with get_db_connection() as conn:
                cursor = get_db_cursor(conn)
                cursor.execute("""
                    SELECT id, name, email
                    FROM users
                    WHERE id = %s
                """, (user_id,))
                
                user = cursor.fetchone()
                if not user:
                    return False, "User not found", None
            
            # Create attendance record
            att_success, att_message, attendance_id = AttendanceService.create_attendance(
                user_id=user_id,
                method='face-one',
                presence=presence,
                face_confidence=confidence
            )
            
            if not att_success:
                return False, att_message, None
            
            return True, f"Attendance recorded for {user['name']}", {
                'attendance_id': attendance_id,
                'user_id': user['id'],
                'user_name': user['name'],
                'user_email': user['email'],
                'method': 'face-one',
                'face_confidence': float(confidence),
                'presence': presence,
                'created_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in attendance_face_one: {str(e)}")
            return False, f"Face attendance failed: {str(e)}", None
    
    @staticmethod
    def attendance_face_all(image_base64: str, presence: str, threshold: float = 0.6) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Record attendance using face recognition (1:N identification)
        Detect one face and identify against all users in database
        
        Args:
            image_base64: Base64 encoded image
            presence: Type of presence (incoming/outcoming)
            threshold: Face match threshold
            
        Returns:
            (success, message, attendance_data)
        """
        try:
            # Detect faces first
            detection_result = detect_faces_from_base64(image_base64)
            
            if 'error' in detection_result:
                return False, detection_result['error'], None
            
            faces = detection_result.get('faces', [])
            
            if len(faces) == 0:
                return False, "No face detected", None
            
            if len(faces) > 1:
                return False, f"Multiple faces detected ({len(faces)}). Please ensure only one person is in frame.", None
            
            # Get face embedding
            detector = get_face_detector()
            img = decode_base64_image(image_base64)
            
            if img is None:
                return False, "Failed to decode image", None
            
            detected = detector.get(img)
            
            if not detected or len(detected) == 0:
                return False, "No face embedding extracted", None
            
            embedding = detected[0].normed_embedding
            
            # Find best match in database (1:N)
            success, message, match_data = find_best_match(embedding, threshold)
            
            if not success or not match_data.get('identified'):
                return False, message or "Face not identified in database", None
            
            # Create attendance record
            att_success, att_message, attendance_id = AttendanceService.create_attendance(
                user_id=match_data['user_id'],
                method='face-all',
                presence=presence,
                face_confidence=match_data.get('confidence', 0.0)
            )
            
            if not att_success:
                return False, att_message, None
            
            return True, f"Attendance recorded for {match_data.get('name')}", {
                'attendance_id': attendance_id,
                'user_id': match_data['user_id'],
                'user_name': match_data.get('name'),
                'user_email': match_data.get('email'),
                'method': 'face-all',
                'face_confidence': match_data.get('confidence', 0.0),
                'presence': presence,
                'created_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in attendance_face_all: {str(e)}")
            return False, f"Face attendance failed: {str(e)}", None
    
    @staticmethod
    def attendance_face_multi(image_base64: str, presence: str, threshold: float = 0.6) -> Tuple[bool, str, Optional[List[Dict[str, Any]]]]:
        """
        Record attendance using face recognition (1:N identification for multiple faces)
        Detect multiple faces and identify each against all users in database
        
        Args:
            image_base64: Base64 encoded image
            presence: Type of presence (incoming/outcoming)
            threshold: Face match threshold
            
        Returns:
            (success, message, list_of_attendance_data)
        """
        try:
            # Detect faces first
            detection_result = detect_faces_from_base64(image_base64)
            
            if 'error' in detection_result:
                return False, detection_result['error'], None
            
            faces = detection_result.get('faces', [])
            
            if len(faces) == 0:
                return False, "No faces detected", None
            
            # Get face embeddings
            detector = get_face_detector()
            img = decode_base64_image(image_base64)
            
            if img is None:
                return False, "Failed to decode image", None
            
            detected = detector.get(img)
            
            if not detected or len(detected) == 0:
                return False, "No face embeddings extracted", None
            
            attendance_list = []
            identified_count = 0
            skipped_count = 0
            
            # Process each face
            for i, face in enumerate(detected):
                embedding = face.normed_embedding
                
                # Find best match in database (1:N)
                success, message, match_data = find_best_match(embedding, threshold)
                
                if success and match_data.get('identified'):
                    user_id = match_data['user_id']
                    
                    # Check if user can record attendance (2 hour minimum)
                    if not AttendanceService.can_record_attendance(user_id, hours=2):
                        logger.info(f"Face {i+1}: Skipped - {match_data.get('name')} already recorded within 2 hours")
                        attendance_list.append({
                            'attendance_id': None,
                            'user_id': user_id,
                            'user_name': match_data.get('name'),
                            'user_email': match_data.get('email'),
                            'method': 'face-multi',
                            'face_confidence': match_data.get('confidence', 0.0),
                            'presence': presence,
                            'created_at': None,
                            'identified': True,
                            'skipped': True,
                            'skip_reason': 'Already recorded within 2 hours'
                        })
                        skipped_count += 1
                        continue
                    
                    # Create attendance record
                    att_success, att_message, attendance_id = AttendanceService.create_attendance(
                        user_id=user_id,
                        method='face-multi',
                        presence=presence,
                        face_confidence=match_data.get('confidence', 0.0)
                    )
                    
                    if att_success:
                        attendance_list.append({
                            'attendance_id': attendance_id,
                            'user_id': user_id,
                            'user_name': match_data.get('name'),
                            'user_email': match_data.get('email'),
                            'method': 'face-multi',
                            'face_confidence': match_data.get('confidence', 0.0),
                            'presence': presence,
                            'created_at': datetime.now().isoformat(),
                            'identified': True,
                            'skipped': False
                        })
                        identified_count += 1
                    else:
                        logger.warning(f"Face {i+1}: Identified but failed to record attendance - {att_message}")
                else:
                    # Face not identified
                    attendance_list.append({
                        'attendance_id': None,
                        'user_id': None,
                        'user_name': None,
                        'user_email': None,
                        'method': 'face-multi',
                        'face_confidence': match_data.get('confidence', 0.0) if match_data else 0.0,
                        'presence': presence,
                        'created_at': None,
                        'identified': False,
                        'skipped': False
                    })
            
            if identified_count == 0 and skipped_count == 0:
                return False, f"No faces identified out of {len(detected)} detected", attendance_list
            
            msg_parts = []
            if identified_count > 0:
                msg_parts.append(f"{identified_count} recorded")
            if skipped_count > 0:
                msg_parts.append(f"{skipped_count} skipped (within 2h)")
            
            message = f"Attendance: {', '.join(msg_parts)} out of {len(detected)} face(s)"
            return True, message, attendance_list
            
        except Exception as e:
            logger.error(f"Error in attendance_face_multi: {str(e)}")
            return False, f"Multi-face attendance failed: {str(e)}", None
    
    @staticmethod
    def get_all_attendance(limit: int = 100, offset: int = 0) -> Tuple[bool, str, Optional[List[Dict[str, Any]]]]:
        """
        Get all attendance records with user info
        
        Args:
            limit: Maximum number of records
            offset: Offset for pagination
            
        Returns:
            (success, message, attendance_list)
        """
        try:
            with get_db_connection() as conn:
                cursor = get_db_cursor(conn)
                cursor.execute("""
                    SELECT 
                        a.id,
                        a.user_id,
                        u.name,
                        u.email,
                        a.method,
                        a.face_confidence,
                        a.presence,
                        a.created_at
                    FROM attendance a
                    JOIN users u ON a.user_id = u.id
                    ORDER BY a.created_at DESC
                    LIMIT %s OFFSET %s
                """, (limit, offset))
                
                rows = cursor.fetchall()
                
                attendance_list = []
                for row in rows:
                    attendance_list.append({
                        'id': row['id'],
                        'user_id': row['user_id'],
                        'user_name': row['name'],
                        'user_email': row['email'],
                        'method': row['method'],
                        'face_confidence': float(row['face_confidence']) if row['face_confidence'] is not None else None,
                        'presence': row['presence'],
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None
                    })
                
                return True, f"Retrieved {len(attendance_list)} attendance record(s)", attendance_list
                
        except Exception as e:
            logger.error(f"Error getting all attendance: {str(e)}")
            return False, f"Failed to retrieve attendance: {str(e)}", None
    
    @staticmethod
    def get_attendance_by_id(attendance_id: int) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Get attendance record by ID
        
        Args:
            attendance_id: Attendance ID
            
        Returns:
            (success, message, attendance_data)
        """
        try:
            with get_db_connection() as conn:
                cursor = get_db_cursor(conn)
                cursor.execute("""
                    SELECT 
                        a.id,
                        a.user_id,
                        u.name,
                        u.email,
                        a.method,
                        a.face_confidence,
                        a.presence,
                        a.created_at
                    FROM attendance a
                    JOIN users u ON a.user_id = u.id
                    WHERE a.id = %s
                """, (attendance_id,))
                
                row = cursor.fetchone()
                
                if not row:
                    return False, "Attendance record not found", None
                
                attendance_data = {
                    'id': row['id'],
                    'user_id': row['user_id'],
                    'user_name': row['name'],
                    'user_email': row['email'],
                    'method': row['method'],
                    'face_confidence': float(row['face_confidence']) if row['face_confidence'] is not None else None,
                    'presence': row['presence'],
                    'created_at': row['created_at'].isoformat() if row['created_at'] else None
                }
                
                return True, "Attendance record retrieved", attendance_data
                
        except Exception as e:
            logger.error(f"Error getting attendance by ID: {str(e)}")
            return False, f"Failed to retrieve attendance: {str(e)}", None
    
    @staticmethod
    def get_user_attendance(user_id: int, limit: int = 50) -> Tuple[bool, str, Optional[List[Dict[str, Any]]]]:
        """
        Get attendance records for specific user
        
        Args:
            user_id: User ID
            limit: Maximum number of records
            
        Returns:
            (success, message, attendance_list)
        """
        try:
            with get_db_connection() as conn:
                cursor = get_db_cursor(conn)
                cursor.execute("""
                    SELECT 
                        a.id,
                        a.user_id,
                        u.name,
                        u.email,
                        a.method,
                        a.face_confidence,
                        a.presence,
                        a.created_at
                    FROM attendance a
                    JOIN users u ON a.user_id = u.id
                    WHERE a.user_id = %s
                    ORDER BY a.created_at DESC
                    LIMIT %s
                """, (user_id, limit))
                
                rows = cursor.fetchall()
                
                attendance_list = []
                for row in rows:
                    attendance_list.append({
                        'id': row['id'],
                        'user_id': row['user_id'],
                        'user_name': row['name'],
                        'user_email': row['email'],
                        'method': row['method'],
                        'face_confidence': float(row['face_confidence']) if row['face_confidence'] is not None else None,
                        'presence': row['presence'],
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None
                    })
                
                return True, f"Retrieved {len(attendance_list)} attendance record(s)", attendance_list
                
        except Exception as e:
            logger.error(f"Error getting user attendance: {str(e)}")
            return False, f"Failed to retrieve attendance: {str(e)}", None

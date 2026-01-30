#!/usr/bin/env python3
"""
Test script untuk verify pgvector embedding parsing
"""
import sys
sys.path.insert(0, '/home/sultan/face-recognition/backend/app')

import numpy as np
from utils.db import get_db_connection, get_db_cursor
from utils.embedding_utils import db_format_to_embedding

print("=" * 60)
print("Testing pgvector Embedding Parsing")
print("=" * 60)

# Test 1: Get embedding from database
print("\n1. Fetching embedding from database...")
try:
    with get_db_connection() as conn:
        cursor = get_db_cursor(conn)
        cursor.execute("""
            SELECT user_id, embedding, quality_score
            FROM face_embeddings
            WHERE user_id = 2
            LIMIT 1
        """)
        result = cursor.fetchone()
        
        if result:
            print(f"   ✅ Found embedding for user_id={result['user_id']}")
            print(f"   Quality score: {result['quality_score']:.4f}")
            
            # Check raw type
            raw_embedding = result['embedding']
            print(f"   Raw type: {type(raw_embedding)}")
            print(f"   Raw value (first 100 chars): {str(raw_embedding)[:100]}...")
            
            # Test 2: Parse embedding
            print("\n2. Parsing embedding...")
            parsed_embedding = db_format_to_embedding(raw_embedding)
            print(f"   ✅ Parsed type: {type(parsed_embedding)}")
            print(f"   ✅ Shape: {parsed_embedding.shape}")
            print(f"   ✅ Dtype: {parsed_embedding.dtype}")
            print(f"   ✅ First 5 values: {parsed_embedding[:5]}")
            print(f"   ✅ Last 5 values: {parsed_embedding[-5:]}")
            
            # Test 3: Verify it's valid embedding
            print("\n3. Validating embedding...")
            if parsed_embedding.shape[0] == 512:
                print("   ✅ Correct dimension (512)")
            else:
                print(f"   ❌ Wrong dimension: {parsed_embedding.shape[0]}")
            
            if parsed_embedding.dtype == np.float32:
                print("   ✅ Correct dtype (float32)")
            else:
                print(f"   ⚠️  Dtype: {parsed_embedding.dtype}")
            
            # Test 4: Check values range
            print("\n4. Checking value ranges...")
            min_val = np.min(parsed_embedding)
            max_val = np.max(parsed_embedding)
            mean_val = np.mean(parsed_embedding)
            print(f"   Min: {min_val:.4f}")
            print(f"   Max: {max_val:.4f}")
            print(f"   Mean: {mean_val:.4f}")
            
            if -1.0 <= min_val <= 1.0 and -1.0 <= max_val <= 1.0:
                print("   ✅ Values in expected range [-1, 1]")
            else:
                print("   ⚠️  Values outside expected range")
            
            print("\n" + "=" * 60)
            print("✅ ALL TESTS PASSED!")
            print("=" * 60)
            
        else:
            print("   ❌ No embedding found for user_id=2")
            
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()

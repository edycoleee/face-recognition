import { useState, useCallback } from 'react'

export function useFileUpload() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [base64Image, setBase64Image] = useState(null)

  const convertFileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        resolve(e.target.result)
      }
      
      reader.onerror = (error) => {
        reject(error)
      }
      
      reader.readAsDataURL(file)
    })
  }, [])

  const handleFileSelect = useCallback(async (file) => {
    try {
      setSelectedFile(file)
      
      // Create preview
      const preview = URL.createObjectURL(file)
      setPreviewImage(preview)
      
      // Convert to base64
      const base64 = await convertFileToBase64(file)
      setBase64Image(base64)
      
      return base64
    } catch (error) {
      console.error('Error processing file:', error)
      throw error
    }
  }, [convertFileToBase64])

  const clearFile = useCallback(() => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage)
    }
    setSelectedFile(null)
    setPreviewImage(null)
    setBase64Image(null)
  }, [previewImage])

  return {
    selectedFile,
    previewImage,
    base64Image,
    handleFileSelect,
    clearFile
  }
}

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FileUp, Link2, LogOut, FileText, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'

interface DriveFile {
  id: string
  name: string
  createdTime: string
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [shareableLink, setShareableLink] = useState<string | null>(null)
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { toast } = useToast()

  const fetchFiles = async (accessToken: string) => {
    setLoadingFiles(true)
    try {
      const response = await fetch('/api/files', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files)
      }
    } catch (error) {
      console.error('[v0] Error fetching files:', error)
    } finally {
      setLoadingFiles(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const userEmail = params.get('email')
    
    if (token && userEmail) {
      localStorage.setItem('google_access_token', token)
      localStorage.setItem('user_email', userEmail)
      setUser({ email: userEmail })
      window.history.replaceState({}, '', '/')
      toast({
        title: 'Welcome!',
        description: `Signed in as ${userEmail}`,
      })
      fetchFiles(token)
    } else {
      const savedToken = localStorage.getItem('google_access_token')
      if (savedToken) {
        const savedEmail = localStorage.getItem('user_email')
        if (savedEmail) {
          setUser({ email: savedEmail })
          fetchFiles(savedToken)
        }
      }
    }
  }, [toast])

  const handleGoogleSignIn = async () => {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'GET',
      })
      const data = await response.json()
      
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to initiate Google sign-in',
        variant: 'destructive',
      })
    }
  }

  const handleSignOut = () => {
    setUser(null)
    setShareableLink(null)
    setFiles([]) // Clear files on sign out
    localStorage.removeItem('google_access_token')
    localStorage.removeItem('user_email')
    toast({
      title: 'Signed out',
      description: 'You have been successfully signed out',
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    setShareableLink(null)

    try {
      const accessToken = localStorage.getItem('google_access_token')
      if (!accessToken) {
        throw new Error('No access token found. Please sign in again.')
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('accessToken', accessToken)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
        
        if (response.status === 401) {
          localStorage.removeItem('google_access_token')
          localStorage.removeItem('user_email')
          setUser(null)
          throw new Error('Session expired. Please sign in again.')
        }
        
        throw new Error(errorData.error || 'Failed to upload PDF')
      }

      const data = await response.json()
      const cleanLink = `${window.location.origin}/view/${data.fileId}`
      setShareableLink(cleanLink)
      
      fetchFiles(accessToken)

      toast({
        title: 'Success!',
        description: 'PDF uploaded and shared successfully',
      })
    } catch (error) {
      console.error('[v0] Upload error:', error)
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload PDF',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const copyToClipboard = (text: string) => { // Updated to accept text argument
    if (text) {
      navigator.clipboard.writeText(text)
      toast({
        title: 'Copied!',
        description: 'Link copied to clipboard',
      })
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl mb-4">
            <FileUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3 text-balance">
            Share PDFs Instantly
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 text-balance max-w-2xl mx-auto">
            Upload your PDF to Google Drive and get a shareable link in seconds
          </p>
        </div>

        {/* Main Card */}
        <div className="max-w-2xl mx-auto space-y-8"> {/* Added space-y-8 for separation */}
          <Card className="p-8 md:p-12 shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
            {!user ? (
              <div className="text-center space-y-6">
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Get Started
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Sign in with Google to upload and share your PDFs
                  </p>
                </div>
                <Button
                  onClick={handleGoogleSignIn}
                  size="lg"
                  className="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-medium px-8 h-12"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* User Info */}
                <div className="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-gray-800">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Signed in as</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">{user.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>

                {/* Upload Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Upload PDF
                  </h3>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload">
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-12 text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
                        <FileUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                          {uploading ? 'Uploading...' : 'Click to upload PDF'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          PDF files only
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Shareable Link */}
                {shareableLink && (
                  <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-800">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      New Upload Link
                    </h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={shareableLink}
                        readOnly
                        className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                      />
                      <Button
                        onClick={() => copyToClipboard(shareableLink)}
                        className="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white"
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Share this link with anyone to let them view your PDF
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {user && files.length > 0 && (
            <Card className="p-8 shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />
                Previous Uploads
              </h3>
              <div className="space-y-4">
                {files.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <FileText className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(file.createdTime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`${window.location.origin}/view/${file.id}`)}
                      className="ml-4 shrink-0 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
      <Toaster />
    </main>
  )
}

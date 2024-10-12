import React from 'react'

export const Avatar = ({ children, ...props }) => (
  <div className="relative w-10 h-10 rounded-full overflow-hidden" {...props}>{children}</div>
)

export const AvatarImage = ({ src, alt, ...props }) => (
  <img src={src} alt={alt} className="w-full h-full object-cover" {...props} />
)

export const AvatarFallback = ({ children, ...props }) => (
  <div className="w-full h-full flex items-center justify-center bg-gray-600 text-white" {...props}>{children}</div>
)
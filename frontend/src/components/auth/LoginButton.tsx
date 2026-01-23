'use client';

import React from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '@/config/msal.config';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

interface LoginButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * Login Button Component
 * 
 * Initiates the MSAL login flow using redirect
 * Redirects user to Microsoft login page
 */
export default function LoginButton({ className, variant = 'default', size = 'default' }: LoginButtonProps) {
  const { instance } = useMsal();

  const handleLogin = async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <Button
      onClick={handleLogin}
      className={className}
      variant={variant}
      size={size}
    >
      <LogIn className="mr-2 h-4 w-4" />
      Iniciar Sesión
    </Button>
  );
}

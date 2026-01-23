'use client';

import React from 'react';
import { useMsal } from '@azure/msal-react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface LogoutButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * Logout Button Component
 * 
 * Logs out the user and clears the session
 * Uses redirect logout to ensure complete session termination
 */
export default function LogoutButton({ className, variant = 'ghost', size = 'default' }: LogoutButtonProps) {
  const { instance } = useMsal();

  const handleLogout = async () => {
    try {
      await instance.logoutRedirect({
        postLogoutRedirectUri: '/',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      className={className}
      variant={variant}
      size={size}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Cerrar Sesión
    </Button>
  );
}

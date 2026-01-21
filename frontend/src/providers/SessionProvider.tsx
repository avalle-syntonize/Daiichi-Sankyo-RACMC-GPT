'use client';
import React from "react"
import { SessionProvider } from 'next-auth/react'
interface Props {
    children: React.ReactNode,
    locale?: any,
    resources?: any,
    namespaces?:any
}

export const AuthProvider = ({ children }: Props) => {
    return (
        <SessionProvider>
                {children}
        </SessionProvider>
    )
}
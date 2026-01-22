'use client'
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
// import { signIn } from "../auth.config";
import { signIn } from "next-auth/react";

export default function UnathorizedLogin() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            <div className="max-w-md w-full bg-white shadow rounded-lg p-8 text-center">
                <div className="flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12A9 9 0 1112 3a9 9 0 019 9z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-semibold mt-6">Ha ocurrido un error, Accesso denegado</h1>
                <p className="mt-2 text-sm text-gray-600">No se pudo completar la operación. Por favor, inténtalo de nuevo.</p>

                <div className="mt-6 flex justify-center gap-3">
                    <Button className="rounded-full" onClick={() => signIn('azure-ad')}>Reintentar</Button>
                    <Link href="/" className="inline-flex items-center px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Ir al inicio</Link>
                </div>
            </div>
        </main>
    )

}


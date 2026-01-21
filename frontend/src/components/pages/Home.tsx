'use client'
import { signIn, useSession } from "next-auth/react";

import { useEffect } from "react";

export function HomePage() {
    const session = useSession();

    useEffect(() => {
        if (session.status === 'unauthenticated') {
            signIn('azure-ad')
        }else if (session.status === 'authenticated') {
            window.location.href = '/chatbot';
        }
    }, [session.status]);

    return (
        <div className="flex items-stretch justify-between w-full h-screen bg-white">

        </div>
    );
}

"use client";

import * as React from "react"
import Image from "next/image";
import { Button } from "./ui/button";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
const data = {

}
export function AppSidebar() {
    const [logout, setLogout] = React.useState(false);
    const session = useSession();
    const pathname = usePathname(); // Obtiene la ruta actual

    if (pathname === "/") {
        return null;
    }

    const handleConfirm = () => {
        setLogout(false);
    };
    const handleCancel = () => {
        signOut();
        setLogout(false);
    };


    return (
        <aside className="lg:p-4 bg-white lg:w-[240px] lg:flex-[240px] w-full flex-1 flex-shrink-0 flex-grow-0 h-full ">
            <div className="flex lg:flex-col flex-row items-center justify-between lg:h-full h-auto px-4 lg:py-8 py-2 lg:pt-8 pt-3 text-center bg-primary logo gap-8">
                <Link href="/">
                    <Image
                        aria-hidden
                        src="/images/logo-informa-negative.svg"
                        alt="logo informa"
                        height={120}
                        width={90}
                    />
                </Link>
                <div>
                    <Button variant="outline" className="w-full rounded-full mb-4" onClick={() => signOut()}>
                        Cerrar sesión
                    </Button>
                    <p className="md:text-sm md:pb-0 pb-1 text-xs md:text-center text-right md:max-w-none max-w-[200px] text-primary-foreground">Copyright {new Date().getFullYear()} Design & development by Syntonize</p>
                </div>
            </div>
        </aside>
    )
}
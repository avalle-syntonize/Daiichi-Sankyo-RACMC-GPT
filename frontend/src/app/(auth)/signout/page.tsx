'use client'
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
// import { signIn } from "../auth.config";
import { SignOutPage } from "../../../components/pages/Signout";
import { getSession } from "@/auth.config";

export default async function Signout() {
    // await getSession()
    return <SignOutPage />
}

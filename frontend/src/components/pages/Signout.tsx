'use client'
// import { signIn } from "../auth.config";
import {  signOut } from "next-auth/react";
import { useEffect } from "react";

export function SignOutPage() {

   useEffect(() => {
      signOut({ callbackUrl: '/' });
   },[])

   return <></>
}


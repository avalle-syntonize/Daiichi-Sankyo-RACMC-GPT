'use client'
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
// import { signIn } from "../auth.config";
import { signIn } from "next-auth/react";

export default function UnathorizedLogin() {
    return (
        <div className="bg-muted flex items-center justify-center gap-6 fake-onboarding">
            <div className="onboarding-item items-end justify-start" style={{
                backgroundImage: "url('/images/onboarding-bg1.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}>

                <div>
                    <h4 className="text-xl font-bold mb-2">Te presentamos a INFORMA.</h4>
                    <p>La inteligencia artificial para transcribir tus consultas médicas.</p>
                </div>
            </div>
            <div className="onboarding-item delay-100 items-end justify-start" style={{
                backgroundImage: "url('/images/onboarding-bg2.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}>
                <div>
                    <h4 className="text-xl font-bold mb-2">¿Cómo funciona?</h4>
                    <p>INFORMA es capaz de entender conversaciones médico/paciente y generar informes de resultados. </p>
                </div>
            </div>
            <div className="onboarding-item delay-200 items-center justify-end flex-col" >

                <Image
                    aria-hidden
                    src="/images/logo-INFORMA-vertical.png"
                    alt="logo INFORMA vertical"
                    height={197}
                    width={142}
                    className="mb-12"
                />

                <div className="text-center">
                    <h4 className="text-xl font-bold mb-2">¿En qué nos ayuda?</h4>
                    <p>Los resultados de los informes podrán ser validados y copiados al historial clínico del paciente.</p>

                    {/* <Link href="/consultas"> */}
                        <Button className="w-full rounded-full mt-6" onClick={() => signIn('azure-ad')}>Comenzar</Button>
                    {/* </Link> */}
                    <p className="text-red-500 mt-2">No esta autorizado para ingresar a la plataforma</p>
                </div>
            </div>
        </div>
    );
}

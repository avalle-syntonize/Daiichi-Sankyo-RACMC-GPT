import { getSession } from "@/auth.config";
import { HomePage } from "@/components/pages/Home";
import { redirect } from "next/navigation";

async function Page() {
    const session = await getSession();

    if(session){
        redirect('/chat');
    }
 
    return <HomePage />
}

export default Page

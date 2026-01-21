import { getSession } from "@/auth.config";
import ChatbotPage from "@/components/pages/Chatbot";
import { redirect } from "next/navigation";


export default async function Page() {
    const session = await getSession();
 
    if(!session) {
        return redirect(`/`);
    } 

    return <ChatbotPage />
}

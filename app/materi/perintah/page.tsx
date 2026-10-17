import type { Metadata } from "next";
import { CommandReferencePage } from "@/components/CommandReferencePage";

export const metadata:Metadata={title:"Referensi Perintah | LinuxLab Cyber",description:"Referensi perintah Linux, administrasi server, Apache, dan MySQL beserta contoh latihan."};
export default function Page(){return <CommandReferencePage />;}

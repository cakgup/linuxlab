import { notFound } from "next/navigation";
import { RoomClient } from "@/components/RoomClient";
import { getRoom } from "@/lib/tracks";

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = getRoom(slug);
  if (!room) notFound();
  return <RoomClient room={room} />;
}

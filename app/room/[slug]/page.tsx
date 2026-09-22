import { notFound } from "next/navigation";
import { RoomClient } from "@/components/RoomClient";
import { getRoom, rooms } from "@/lib/tracks";

export function generateStaticParams() {
  return rooms.map((room) => ({ slug: room.slug }));
}

export const dynamicParams = false;

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = getRoom(slug);
  if (!room) notFound();
  return <RoomClient room={room} />;
}

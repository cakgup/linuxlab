import { Activity, FileKey2, Flag, Search, ShieldCheck, Terminal } from "lucide-react";
import { RoomDefinition } from "@/lib/types";

export function RoomIcon({ icon }: { icon: RoomDefinition["icon"] }) {
  const props = { size: 21, strokeWidth: 1.8 };
  return (
    <span className="room-icon">
      {icon === "terminal" && <Terminal {...props} />}
      {icon === "shield" && <ShieldCheck {...props} />}
      {icon === "file" && <FileKey2 {...props} />}
      {icon === "search" && <Search {...props} />}
      {icon === "activity" && <Activity {...props} />}
      {icon === "flag" && <Flag {...props} />}
    </span>
  );
}

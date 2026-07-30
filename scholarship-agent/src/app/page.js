import ChatWindow from "@/components/ChatWindow";
import Sidebar from "@/components/Sidebar";

export default function Home() {
  return (
    <main className="h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex h-full">

        <div className="flex-1 border-r border-zinc-800">
          <ChatWindow />
        </div>

        <div className="w-[360px]">
          <Sidebar />
        </div>

      </div>
    </main>
  );
}
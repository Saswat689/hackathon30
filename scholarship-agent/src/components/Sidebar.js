export default function Sidebar() {
  return (
    <div className="p-6 bg-zinc-900 h-full">
      <Section title="📄 Required Documents">
        <li>Aadhaar</li>
        <li>Income Certificate</li>
        <li>Community Certificate</li>
      </Section>

      <Section title="🚀 Next Steps">
        <li>Visit NSP</li>
        <li>Upload documents</li>
        <li>Apply before Aug 15</li>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="mb-4 font-bold text-lg">{title}</h2>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Card({ text }) {
  return <div className="rounded-lg bg-zinc-800 p-4">🟢 {text}</div>;
}

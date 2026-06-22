import { TextReveal } from "@/components/ui/cascade-text";

export default function DemoOne() {
  return (
    <div
      className="cascade-demo"
      style={{ background: "var(--demo-bg)", color: "var(--demo-text)" }}
    >
      <TextReveal text="Hover me" />
    </div>
  );
}

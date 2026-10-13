export function BoldText({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\*\*([\s\S]+?)\*\*/g)
        .map((part, index) =>
          index % 2 === 1 ? <strong key={index}>{part}</strong> : part,
        )}
    </>
  );
}

export function BoldText({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*[^*\n]+?\*)/g)
        .map((part, index) => {
          if (part.startsWith('***') && part.endsWith('***')) {
            return (
              <strong key={index}>
                <em>{part.slice(3, -3)}</em>
              </strong>
            );
          }
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={index}>{part.slice(1, -1)}</em>;
          }
          return part;
        })}
    </>
  );
}

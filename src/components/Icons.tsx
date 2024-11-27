export const NerdFontIcon = ({ unicode }: { unicode: string }) => {
  return <span dangerouslySetInnerHTML={{ __html: `&#x${unicode};` }} />;
};

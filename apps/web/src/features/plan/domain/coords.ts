export type PercentPoint = { x: number; y: number };

export function clientPointToPercentPoint(args: {
  clientX: number;
  clientY: number;
  containerRect: DOMRect;
}): PercentPoint {
  const x = ((args.clientX - args.containerRect.left) / args.containerRect.width) * 100;
  const y = ((args.clientY - args.containerRect.top) / args.containerRect.height) * 100;
  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
  };
}


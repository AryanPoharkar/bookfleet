import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() { return <div className="mx-auto max-w-5xl space-y-6"><Skeleton className="h-10 w-64"/><div className="grid gap-6 md:grid-cols-2"><Skeleton className="h-48"/><div className="space-y-3">{Array.from({length:4},(_,i)=><Skeleton key={i} className="h-14 w-full"/>)}</div></div></div>; }

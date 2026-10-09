import { ImageResponse } from "next/og";
import { getPublicBusiness } from "@/server/tenancy/public-business";
import { resolveAccent } from "@/features/public-booking/accent-colors";
export const size={width:1200,height:630}; export const contentType="image/png"; export const alt="Book online with this business";
export default async function OpenGraphImage({params}:{params:Promise<{slug:string}>}) { const {slug}=await params; const business=await getPublicBusiness(slug); const accent=resolveAccent(business?.accentColor).hex; return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",background:"#FBF9F6",padding:72,color:"#1B1A17"}}><div style={{width:1200,height:24,background:accent,margin:"-72px -72px 80px"}}/><div style={{fontSize:68,fontWeight:700}}>{business?.name??"Bookfleet"}</div><div style={{fontSize:34,marginTop:24}}>Book online</div><div style={{fontSize:24,marginTop:100,color:"#5B5751"}}>Powered by Bookfleet</div></div>,size); }

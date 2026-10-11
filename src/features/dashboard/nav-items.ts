import type { Permission } from "@/server/rbac/permissions";
export type NavItem = { label:string; href:string; icon:string; permission?:Permission; staffOnly?:boolean };
export const NAV_ITEMS: NavItem[] = [
 {label:"Overview",href:"",icon:"layout-dashboard"},
 {label:"Bookings",href:"/bookings",icon:"calendar-days",permission:"booking:view_own"},
 {label:"Services",href:"/services",icon:"scissors",permission:"service:manage"},
 {label:"Staff",href:"/staff",icon:"users",permission:"staff:manage"},
 {label:"My schedule",href:"/staff/:staffId/schedule",icon:"calendar-days",staffOnly:true},
 {label:"Members",href:"/members",icon:"user-round-cog",permission:"members:manage"},
 {label:"Settings",href:"/settings",icon:"settings",permission:"settings:manage"},
 {label:"Billing",href:"/billing",icon:"credit-card",permission:"billing:manage"},
];

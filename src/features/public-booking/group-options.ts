type Service = { id: string; name: string; durationMinutes: number; priceCents: number };
type Staff = { id: string; name: string; bio: string | null; photoUrl: string | null };
export function groupBookingOptions({ services, staff, links }: { services: Service[]; staff: Staff[]; links: { serviceId: string; staffId: string }[] }) {
  const staffById = new Map(staff.map((person) => [person.id, person]));
  const servicesByName = [...services].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const staffSorted = [...staff].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return { services: servicesByName.map((service) => ({ ...service, staff: staffSorted.filter((person) => links.some((link) => link.serviceId === service.id && link.staffId === person.id)).map((person) => staffById.get(person.id)!).filter(Boolean) })).filter((service) => service.staff.length > 0) };
}

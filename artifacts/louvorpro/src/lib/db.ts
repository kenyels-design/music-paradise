import { supabase } from "./supabase";

// ─── TYPES ─────────────────────────────────────────────────────────────────

export interface Member {
  id: number; name: string; email: string; phone: string | null;
  role: string; isLeader: boolean; avatarUrl: string | null;
  notes: string | null; createdAt: string;
}

export interface Song {
  id: number; title: string; artist: string | null; key: string | null;
  bpm: number | null; tags: string[]; lyrics: string | null;
  chordChart: string | null; youtubeUrl: string | null; notes: string | null;
  isNew: boolean; hasBrass: boolean; cifraClubUrl: string | null;
  lastUsedAt: string | null; createdAt: string;
}

export interface Service {
  id: number; title: string; date: string; time: string | null;
  theme: string | null; leaderNotes: string | null;
  status: string; createdAt: string;
}

export interface SetlistItem {
  id: number; serviceId: number; songId: number; order: number;
  keyOverride: string | null; notes: string | null;
  song: Song;
}

export type AssignmentStatus = 'pendente' | 'confirmado' | 'recusado';

export interface ServiceAssignment {
  id: number; serviceId: number; memberId: number; role: string | null;
  status: AssignmentStatus;
  member: Member;
}

export interface MyAssignment {
  id: number;
  serviceId: number;
  serviceTitle: string;
  serviceDate: string;
  serviceTime: string | null;
  serviceTheme: string | null;
  assignmentRole: string | null;
  status: AssignmentStatus;
}

export interface Announcement {
  id: number; title: string; body: string; authorName: string;
  isPinned: boolean; validUntil: string | null; createdAt: string;
}

export interface Playlist {
  id: number; serviceId: number | null; name: string; notes: string | null;
  spotifyUrl: string | null; youtubeUrl: string | null; createdAt: string;
}

export interface Absence {
  id: number; memberId: number; date: string;
  reason: string | null; createdAt: string;
}

// ─── MAPPERS ───────────────────────────────────────────────────────────────

const mapMember = (m: any): Member => ({
  id: m.id, name: m.name, email: m.email, phone: m.phone,
  role: m.role, isLeader: m.is_leader, avatarUrl: m.avatar_url,
  notes: m.notes, createdAt: m.created_at,
});

const mapSong = (s: any): Song => ({
  id: s.id, title: s.title, artist: s.artist, key: s.key, bpm: s.bpm,
  tags: s.tags || [], lyrics: s.lyrics, chordChart: s.chord_chart,
  youtubeUrl: s.youtube_url, notes: s.notes, isNew: s.is_new,
  hasBrass: s.has_brass, cifraClubUrl: s.cifra_club_url,
  lastUsedAt: s.last_used_at, createdAt: s.created_at,
});

const mapService = (s: any): Service => ({
  id: s.id, title: s.title, date: s.date, time: s.time,
  theme: s.theme, leaderNotes: s.leader_notes,
  status: s.status, createdAt: s.created_at,
});

const mapSetlistItem = (item: any): SetlistItem => ({
  id: item.id, serviceId: item.service_id, songId: item.song_id,
  order: item.order, keyOverride: item.key_override, notes: item.notes,
  song: mapSong(item.song),
});

const mapAssignment = (a: any): ServiceAssignment => ({
  id: a.id, serviceId: a.service_id, memberId: a.member_id,
  role: a.role, status: (a.status || 'pendente') as AssignmentStatus,
  member: mapMember(a.member),
});

const mapAnnouncement = (a: any): Announcement => ({
  id: a.id, title: a.title, body: a.body, authorName: a.author_name,
  isPinned: a.is_pinned, validUntil: a.valid_until ?? null, createdAt: a.created_at,
});

const mapPlaylist = (p: any): Playlist => ({
  id: p.id, serviceId: p.service_id, name: p.name, notes: p.notes,
  spotifyUrl: p.spotify_url, youtubeUrl: p.youtube_url, createdAt: p.created_at,
});

const mapAbsence = (a: any): Absence => ({
  id: a.id, memberId: a.member_id, date: a.date,
  reason: a.reason, createdAt: a.created_at,
});

function raise(error: any): never {
  throw new Error(error?.message || "Erro desconhecido no Supabase");
}

// ─── MEMBERS ───────────────────────────────────────────────────────────────

export async function listMembers(): Promise<Member[]> {
  const { data, error } = await supabase.from("members").select("*").order("name");
  if (error) raise(error);
  return (data || []).map(mapMember);
}

export async function createMember(input: {
  name: string; email: string; role: string; isLeader?: boolean; notes?: string;
}): Promise<Member> {
  const { data, error } = await supabase.from("members").insert({
    name: input.name, email: input.email, role: input.role,
    is_leader: input.isLeader ?? false, notes: input.notes || null,
  }).select().single();
  if (error) raise(error);
  return mapMember(data);
}

export async function updateMember(input: {
  id: number; name?: string; email?: string; role?: string;
  isLeader?: boolean; notes?: string;
}): Promise<Member> {
  const { id, ...rest } = input;
  const { data, error } = await supabase.from("members").update({
    name: rest.name, email: rest.email, role: rest.role,
    is_leader: rest.isLeader, notes: rest.notes ?? null,
  }).eq("id", id).select().single();
  if (error) raise(error);
  return mapMember(data);
}

export async function deleteMember(id: number): Promise<void> {
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) raise(error);
}

// ─── SONGS ─────────────────────────────────────────────────────────────────

export async function listSongs(): Promise<Song[]> {
  const { data, error } = await supabase.from("songs").select("*").order("title");
  if (error) raise(error);
  return (data || []).map(mapSong);
}

export async function createSong(input: {
  title: string; artist?: string | null; key?: string | null; bpm?: number | null;
  tags?: string[]; lyrics?: string | null; chordChart?: string | null;
  youtubeUrl?: string | null; notes?: string | null;
  isNew?: boolean; hasBrass?: boolean; cifraClubUrl?: string | null;
}): Promise<Song> {
  const { data, error } = await supabase.from("songs").insert({
    title: input.title, artist: input.artist || null, key: input.key || null,
    bpm: input.bpm || null, tags: input.tags, lyrics: input.lyrics || null,
    chord_chart: input.chordChart || null, youtube_url: input.youtubeUrl || null,
    notes: input.notes || null, is_new: input.isNew, has_brass: input.hasBrass,
    cifra_club_url: input.cifraClubUrl || null,
  }).select().single();
  if (error) raise(error);
  return mapSong(data);
}

export async function updateSong({ id, ...input }: { id: number } & Partial<Omit<Song, "id" | "createdAt">>): Promise<Song> {
  const { data, error } = await supabase.from("songs").update({
    title: input.title, artist: input.artist ?? null, key: input.key ?? null,
    bpm: input.bpm ?? null, tags: input.tags, lyrics: input.lyrics ?? null,
    chord_chart: input.chordChart ?? null, youtube_url: input.youtubeUrl ?? null,
    notes: input.notes ?? null, is_new: input.isNew, has_brass: input.hasBrass,
    cifra_club_url: input.cifraClubUrl ?? null,
  }).eq("id", id).select().single();
  if (error) raise(error);
  return mapSong(data);
}

export async function deleteSong(id: number): Promise<void> {
  const { error } = await supabase.from("songs").delete().eq("id", id);
  if (error) raise(error);
}

// ─── SERVICES ──────────────────────────────────────────────────────────────

export async function listServices(): Promise<Service[]> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  await supabase.from("services").update({ status: "completed" })
    .lt("date", yesterdayStr).neq("status", "completed");

  const { data, error } = await supabase.from("services").select("*").order("date");
  if (error) raise(error);
  return (data || []).map(mapService);
}

export async function getService(id: number): Promise<Service> {
  const { data, error } = await supabase.from("services").select("*").eq("id", id).single();
  if (error) raise(error);
  return mapService(data);
}

export async function createService(input: {
  title: string; date: string; time?: string; theme?: string; status?: string;
}): Promise<Service> {
  const { data, error } = await supabase.from("services").insert({
    title: input.title, date: input.date,
    time: input.time || null, theme: input.theme || null,
    status: input.status || "draft",
  }).select().single();
  if (error) raise(error);
  return mapService(data);
}

export async function updateService(id: number, input: {
  title: string; date: string; time?: string; theme?: string;
}): Promise<Service> {
  const { data, error } = await supabase.from("services")
    .update({ title: input.title, date: input.date, time: input.time || null, theme: input.theme || null })
    .eq("id", id).select().single();
  if (error) raise(error);
  return mapService(data);
}

export async function deleteService(id: number): Promise<void> {
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) raise(error);
}

// ─── SETLIST ───────────────────────────────────────────────────────────────

export async function getSetlist(serviceId: number): Promise<SetlistItem[]> {
  const { data, error } = await supabase
    .from("setlist_items").select("*, song:songs(*)").eq("service_id", serviceId).order("order");
  if (error) raise(error);
  return (data || []).map(mapSetlistItem);
}

export async function addToSetlist(input: {
  serviceId: number; songId: number; order?: number; keyOverride?: string | null;
}): Promise<SetlistItem> {
  const { data, error } = await supabase.from("setlist_items").insert({
    service_id: input.serviceId, song_id: input.songId,
    order: input.order ?? 0, key_override: input.keyOverride ?? null,
  }).select("*, song:songs(*)").single();
  if (error) raise(error);
  return mapSetlistItem(data);
}

export async function removeFromSetlist(itemId: number): Promise<void> {
  const { error } = await supabase.from("setlist_items").delete().eq("id", itemId);
  if (error) raise(error);
}

// ─── SERVICE ASSIGNMENTS ───────────────────────────────────────────────────

export async function listServiceAssignments(serviceId: number): Promise<ServiceAssignment[]> {
  const { data, error } = await supabase
    .from("service_assignments").select("*, member:members(*)").eq("service_id", serviceId);
  if (error) raise(error);
  return (data || []).map(mapAssignment);
}

export async function createServiceAssignment(input: {
  serviceId: number; memberId: number; role?: string | null;
}): Promise<ServiceAssignment> {
  const { data, error } = await supabase.from("service_assignments").insert({
    service_id: input.serviceId, member_id: input.memberId, role: input.role ?? null,
  }).select("*, member:members(*)").single();
  if (error) raise(error);
  return mapAssignment(data);
}

export async function deleteServiceAssignment(id: number): Promise<void> {
  const { error } = await supabase.from("service_assignments").delete().eq("id", id);
  if (error) raise(error);
}

export async function updateAssignmentStatus(assignmentId: number, status: AssignmentStatus): Promise<void> {
  const { error } = await supabase
    .from("service_assignments")
    .update({ status })
    .eq("id", assignmentId);
  if (error) raise(error);
}

export async function listMyUpcomingAssignments(memberEmail: string): Promise<MyAssignment[]> {
  const { data: memberData } = await supabase
    .from("members")
    .select("id")
    .eq("email", memberEmail)
    .maybeSingle();

  if (!memberData) return [];

  const { data, error } = await supabase
    .from("service_assignments")
    .select("*, service:services(*)")
    .eq("member_id", (memberData as any).id)
    .neq("status", "recusado");

  if (error) raise(error);

  const today = new Date().toISOString().split("T")[0];
  return ((data || []) as any[])
    .filter(a => a.service && a.service.date >= today)
    .sort((a, b) => a.service.date.localeCompare(b.service.date))
    .map(a => ({
      id: a.id,
      serviceId: a.service_id,
      serviceTitle: a.service.title,
      serviceDate: a.service.date,
      serviceTime: a.service.time,
      serviceTheme: a.service.theme,
      assignmentRole: a.role,
      status: (a.status || 'pendente') as AssignmentStatus,
    }));
}

export async function listMyPendingAssignments(memberEmail: string): Promise<MyAssignment[]> {
  const { data: memberData } = await supabase
    .from("members")
    .select("id")
    .eq("email", memberEmail)
    .maybeSingle();

  if (!memberData) return [];

  const { data, error } = await supabase
    .from("service_assignments")
    .select("*, service:services(*)")
    .eq("member_id", (memberData as any).id)
    .eq("status", "pendente");

  if (error) raise(error);

  const today = new Date().toISOString().split("T")[0];
  return ((data || []) as any[])
    .filter(a => a.service && a.service.date >= today)
    .map(a => ({
      id: a.id,
      serviceId: a.service_id,
      serviceTitle: a.service.title,
      serviceDate: a.service.date,
      serviceTime: a.service.time,
      serviceTheme: a.service.theme,
      assignmentRole: a.role,
      status: (a.status || 'pendente') as AssignmentStatus,
    }));
}

// ─── ANNOUNCEMENTS ─────────────────────────────────────────────────────────

export async function listAnnouncements(): Promise<Announcement[]> {
  const today = new Date().toISOString().split("T")[0];
  // Try with valid_until filter (column may not exist yet, fallback gracefully)
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .or(`valid_until.is.null,valid_until.gte.${today}`)
    .order("created_at", { ascending: false });
  if (error) {
    // If column doesn't exist, fall back to unfiltered query
    if (error.code === "PGRST116" || error.message?.includes("valid_until")) {
      const { data: fallback, error: e2 } = await supabase
        .from("announcements").select("*").order("created_at", { ascending: false });
      if (e2) raise(e2);
      return (fallback || []).map(mapAnnouncement);
    }
    raise(error);
  }
  return (data || []).map(mapAnnouncement);
}

export async function createAnnouncement(input: {
  title: string; body: string; authorName: string; isPinned?: boolean; validUntil?: string | null;
}): Promise<Announcement> {
  const payload: any = {
    title: input.title, body: input.body,
    author_name: input.authorName, is_pinned: input.isPinned ?? false,
  };
  if (input.validUntil !== undefined) payload.valid_until = input.validUntil ?? null;
  const { data, error } = await supabase.from("announcements").insert(payload).select().single();
  if (error) {
    // If valid_until column doesn't exist, retry without it
    if (error.message?.includes("valid_until")) {
      delete payload.valid_until;
      const { data: d2, error: e2 } = await supabase.from("announcements").insert(payload).select().single();
      if (e2) raise(e2);
      return mapAnnouncement(d2);
    }
    raise(error);
  }
  return mapAnnouncement(data);
}

export async function deleteAnnouncement(id: number): Promise<void> {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) raise(error);
}

// ─── PLAYLISTS ─────────────────────────────────────────────────────────────

export async function listPlaylists(serviceId: number): Promise<Playlist[]> {
  const { data, error } = await supabase
    .from("playlists").select("*").eq("service_id", serviceId).order("created_at");
  if (error) raise(error);
  return (data || []).map(mapPlaylist);
}

export async function createPlaylist(input: {
  serviceId: number; name: string; notes?: string;
  spotifyUrl?: string; youtubeUrl?: string;
}): Promise<Playlist> {
  const { data, error } = await supabase.from("playlists").insert({
    service_id: input.serviceId, name: input.name,
    notes: input.notes || null,
    spotify_url: input.spotifyUrl || null, youtube_url: input.youtubeUrl || null,
  }).select().single();
  if (error) raise(error);
  return mapPlaylist(data);
}

export async function deletePlaylist(id: number): Promise<void> {
  const { error } = await supabase.from("playlists").delete().eq("id", id);
  if (error) raise(error);
}

// ─── CHANNEL MAP ───────────────────────────────────────────────────────────

export interface ChannelMap {
  id: number;
  instrument: string;
  inputChannel: number | null;
  outputChannel: number | null;
  notes: string | null;
  createdAt: string;
}

const mapChannelMap = (c: any): ChannelMap => ({
  id: c.id, instrument: c.instrument,
  inputChannel: c.input_channel, outputChannel: c.output_channel,
  notes: c.notes, createdAt: c.created_at,
});

export async function listChannelMap(): Promise<{ data: ChannelMap[]; tableExists: boolean }> {
  const { data, error } = await supabase.from("channel_maps").select("*").order("input_channel", { ascending: true, nullsFirst: false });
  if (error) {
    if (error.code === "PGRST205" || error.message?.includes("channel_maps")) {
      return { data: [], tableExists: false };
    }
    raise(error);
  }
  return { data: (data || []).map(mapChannelMap), tableExists: true };
}

export async function createChannelMap(input: {
  instrument: string; inputChannel?: number | null; outputChannel?: number | null; notes?: string | null;
}): Promise<ChannelMap> {
  const { data, error } = await supabase.from("channel_maps").insert({
    instrument: input.instrument,
    input_channel: input.inputChannel ?? null,
    output_channel: input.outputChannel ?? null,
    notes: input.notes || null,
  }).select().single();
  if (error) raise(error);
  return mapChannelMap(data);
}

export async function updateChannelMap(input: {
  id: number; instrument?: string; inputChannel?: number | null; outputChannel?: number | null; notes?: string | null;
}): Promise<ChannelMap> {
  const { id, ...rest } = input;
  const { data, error } = await supabase.from("channel_maps").update({
    instrument: rest.instrument,
    input_channel: rest.inputChannel ?? null,
    output_channel: rest.outputChannel ?? null,
    notes: rest.notes ?? null,
  }).eq("id", id).select().single();
  if (error) raise(error);
  return mapChannelMap(data);
}

export async function deleteChannelMap(id: number): Promise<void> {
  const { error } = await supabase.from("channel_maps").delete().eq("id", id);
  if (error) raise(error);
}

// ─── ABSENCES ──────────────────────────────────────────────────────────────

export async function listAbsences(): Promise<Absence[]> {
  const { data, error } = await supabase.from("absences").select("*").order("date");
  if (error) raise(error);
  return (data || []).map(mapAbsence);
}

export async function createAbsence(input: {
  memberId: number; date: string; reason?: string;
}): Promise<Absence> {
  const { data, error } = await supabase.from("absences").insert({
    member_id: input.memberId, date: input.date, reason: input.reason || null,
  }).select().single();
  if (error) raise(error);
  return mapAbsence(data);
}

export async function deleteAbsence(id: number): Promise<void> {
  const { error } = await supabase.from("absences").delete().eq("id", id);
  if (error) raise(error);
}

// ─── FREE PLAYLISTS ─────────────────────────────────────────────────────────

export interface FreePlaylist {
  id: number;
  name: string;
  description: string | null;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  createdAt: string;
  songs?: Song[];
}

const mapFreePlaylist = (p: any): FreePlaylist => ({
  id: p.id, name: p.name, description: p.description ?? null,
  spotifyUrl: p.spotify_url ?? null, youtubeUrl: p.youtube_url ?? null,
  createdAt: p.created_at,
});

export async function listFreePlaylists(): Promise<{ data: FreePlaylist[]; tableExists: boolean }> {
  const { data, error } = await supabase.from("free_playlists").select("*").order("created_at", { ascending: false });
  if (error) {
    if (error.code === "PGRST205" || error.message?.includes("free_playlists")) {
      return { data: [], tableExists: false };
    }
    raise(error);
  }
  return { data: (data || []).map(mapFreePlaylist), tableExists: true };
}

export async function createFreePlaylist(input: {
  name: string; description?: string | null;
  spotifyUrl?: string | null; youtubeUrl?: string | null;
}): Promise<FreePlaylist> {
  const { data, error } = await supabase.from("free_playlists").insert({
    name: input.name, description: input.description || null,
    spotify_url: input.spotifyUrl || null, youtube_url: input.youtubeUrl || null,
  }).select().single();
  if (error) raise(error);
  return mapFreePlaylist(data);
}

export async function updateFreePlaylist(input: {
  id: number; name?: string; description?: string | null;
  spotifyUrl?: string | null; youtubeUrl?: string | null;
}): Promise<FreePlaylist> {
  const { id, ...rest } = input;
  const { data, error } = await supabase.from("free_playlists").update({
    name: rest.name, description: rest.description ?? null,
    spotify_url: rest.spotifyUrl ?? null, youtube_url: rest.youtubeUrl ?? null,
  }).eq("id", id).select().single();
  if (error) raise(error);
  return mapFreePlaylist(data);
}

export async function deleteFreePlaylist(id: number): Promise<void> {
  const { error } = await supabase.from("free_playlists").delete().eq("id", id);
  if (error) raise(error);
}

export async function getFreePlaylistSongs(playlistId: number): Promise<Song[]> {
  const { data, error } = await supabase
    .from("free_playlist_songs")
    .select("song:songs(*)")
    .eq("playlist_id", playlistId)
    .order("created_at");
  if (error) raise(error);
  return (data || []).map((r: any) => mapSong(r.song));
}

export async function addSongToFreePlaylist(playlistId: number, songId: number): Promise<void> {
  const { error } = await supabase.from("free_playlist_songs").insert({ playlist_id: playlistId, song_id: songId });
  if (error && !error.message?.includes("unique")) raise(error);
}

export async function removeSongFromFreePlaylist(playlistId: number, songId: number): Promise<void> {
  const { error } = await supabase.from("free_playlist_songs")
    .delete().eq("playlist_id", playlistId).eq("song_id", songId);
  if (error) raise(error);
}

// ─── HEALTH SCORE ────────────────────────────────────────────────────────────

export interface HealthScore {
  topPlayed: { song: Song; count: number }[];
  frozen: Song[];
}

export async function getHealthScore(): Promise<HealthScore> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const d90 = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const d60 = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: services90, error: e1 } = await supabase
    .from("services").select("id").gte("date", d90).lt("date", todayStr);
  if (e1) raise(e1);

  const ids90 = (services90 || []).map(s => s.id);
  let topPlayed: { song: Song; count: number }[] = [];

  if (ids90.length > 0) {
    const { data: items90, error: e2 } = await supabase
      .from("setlist_items").select("song_id, song:songs(*)").in("service_id", ids90);
    if (e2) raise(e2);

    const countMap = new Map<number, { song: Song; count: number }>();
    for (const item of (items90 || [])) {
      if (!item.song_id || !item.song) continue;
      if (!countMap.has(item.song_id)) {
        countMap.set(item.song_id, { song: mapSong(item.song as any), count: 0 });
      }
      countMap.get(item.song_id)!.count++;
    }
    topPlayed = Array.from(countMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }

  const { data: services60, error: e3 } = await supabase
    .from("services").select("id").gte("date", d60).lt("date", todayStr);
  if (e3) raise(e3);

  const ids60 = (services60 || []).map(s => s.id);
  let usedSongIds60 = new Set<number>();

  if (ids60.length > 0) {
    const { data: items60, error: e4 } = await supabase
      .from("setlist_items").select("song_id").in("service_id", ids60);
    if (e4) raise(e4);
    usedSongIds60 = new Set((items60 || []).map((i: any) => i.song_id));
  }

  const { data: allSongs, error: e5 } = await supabase.from("songs").select("*").order("title");
  if (e5) raise(e5);

  const frozen = (allSongs || []).filter(s => !usedSongIds60.has(s.id)).map(mapSong);

  return { topPlayed, frozen };
}

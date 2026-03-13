import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Megaphone, Plus, Trash2, Star, Pin } from "lucide-react";
import { 
  useListAnnouncements, 
  useCreateAnnouncement, 
  useDeleteAnnouncement,
  getListAnnouncementsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(5, "Body must be at least 5 characters"),
  authorName: z.string().min(1, "Author name required"),
  isPinned: z.boolean().default(false),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export default function Announcements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: announcements, isLoading } = useListAnnouncements();
  
  const createMutation = useCreateAnnouncement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
        toast({ title: "Announcement posted" });
        setIsDialogOpen(false);
        form.reset();
      }
    }
  });

  const deleteMutation = useDeleteAnnouncement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
        toast({ title: "Announcement deleted" });
      }
    }
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: "", body: "", authorName: "Worship Leader", isPinned: false },
  });

  const onSubmit = (data: AnnouncementFormValues) => {
    createMutation.mutate({ data });
  };

  const sortedAnnouncements = announcements?.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Announcements</h1>
          <p className="text-muted-foreground">Keep the team informed with important updates.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="hover-elevate shadow-md w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> New Post
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post Announcement</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl><Input placeholder="Rehearsal Time Change" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="body" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl><Textarea placeholder="Type your message here..." className="min-h-[100px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="authorName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posted By</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isPinned" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Pin to Dashboard</FormLabel>
                      <p className="text-sm text-muted-foreground">Keep this at the top of the team's dashboard.</p>
                    </div>
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Posting..." : "Post Announcement"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4 max-w-4xl">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))
        ) : sortedAnnouncements.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed rounded-xl border-border">
            <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">No announcements</h3>
            <p className="text-muted-foreground text-sm mb-4">Post an update to keep your team in the loop.</p>
          </div>
        ) : (
          sortedAnnouncements.map((announcement, index) => (
            <motion.div 
              key={announcement.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`overflow-hidden border-border/50 ${announcement.isPinned ? 'border-accent/30 shadow-md shadow-accent/5' : ''}`}>
                <CardHeader className={`pb-2 ${announcement.isPinned ? 'bg-accent/5' : 'bg-secondary/20'}`}>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {announcement.isPinned && <Pin className="w-4 h-4 text-accent fill-accent" />}
                      {announcement.title}
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive -mt-2 -mr-2"
                      onClick={() => {
                        if(confirm('Delete this announcement?')) deleteMutation.mutate({ id: announcement.id });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-foreground whitespace-pre-wrap">{announcement.body}</p>
                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>{announcement.authorName}</span>
                    <span>{format(parseISO(announcement.createdAt), 'MMM d, yyyy • h:mm a')}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Plus, ArrowRight, Clock, Trash2 } from "lucide-react";
import { 
  useListServices, 
  useCreateService, 
  useDeleteService,
  getListServicesQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const serviceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().optional(),
  theme: z.string().optional(),
  status: z.enum(["draft", "confirmed", "completed"]),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

export default function Services() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: services, isLoading } = useListServices();
  
  const createMutation = useCreateService({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        toast({ title: "Service scheduled" });
        setIsDialogOpen(false);
        form.reset();
      }
    }
  });

  const deleteMutation = useDeleteService({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        toast({ title: "Service deleted" });
      }
    }
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: "Sunday Worship",
      date: format(new Date(), 'yyyy-MM-dd'),
      time: "10:00",
      theme: "",
      status: "draft",
    },
  });

  const onSubmit = (data: ServiceFormValues) => {
    createMutation.mutate({ data });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'completed': return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
      default: return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400';
    }
  };

  const sortedServices = services?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Schedule</h1>
          <p className="text-muted-foreground">Plan upcoming worship services and setlists.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="hover-elevate shadow-md w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Schedule Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule New Service</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Title</FormLabel>
                    <FormControl><Input placeholder="Sunday Worship" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="time" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time (Optional)</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="theme" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme / Focus (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g. Grace, Resurrection" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Service"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : sortedServices.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed rounded-xl border-border">
            <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">No services scheduled</h3>
            <p className="text-muted-foreground text-sm mb-4">Create your first service to start planning.</p>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>Schedule Now</Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedServices.map((service, index) => (
              <motion.div 
                key={service.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden hover:border-primary/40 transition-colors group">
                  <CardContent className="p-0 flex flex-col sm:flex-row items-stretch">
                    <div className="bg-secondary/50 p-4 sm:w-48 flex flex-col justify-center border-b sm:border-b-0 sm:border-r border-border/50">
                      <p className="text-sm font-semibold text-primary uppercase tracking-wider">
                        {format(parseISO(service.date), 'MMM')}
                      </p>
                      <p className="text-3xl font-display font-bold text-foreground -mt-1">
                        {format(parseISO(service.date), 'dd')}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {service.time || 'TBD'}
                      </p>
                    </div>
                    
                    <div className="p-4 sm:p-6 flex-1 flex flex-col justify-center">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-foreground">{service.title}</h3>
                          {service.theme && <p className="text-muted-foreground mt-1">{service.theme}</p>}
                        </div>
                        <Badge variant="outline" className={`${getStatusColor(service.status)} capitalize`}>
                          {service.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 bg-secondary/10 flex items-center justify-end sm:justify-center border-t sm:border-t-0 sm:border-l border-border/50 gap-2">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={(e) => {
                        e.preventDefault();
                        if(confirm('Delete this service?')) deleteMutation.mutate({ id: service.id });
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button asChild className="hover-elevate">
                        <Link href={`/services/${service.id}`}>
                          Plan <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

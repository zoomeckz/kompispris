import { AdminLayout } from "@/components/AdminLayout";
import { useState } from "react";
import { Search, Plus, Upload, Music, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Work {
  id: string;
  title: string;
  artist: string;
  isrc: string;
  coverUrl?: string;
  status: "Live" | "Processing" | "Review" | "Draft";
  releaseDate: string;
  genre: string;
}

const mockWorks: Work[] = [
  { id: "1", title: "Midnight Dreams", artist: "Luna Waves", isrc: "USRC12345678", status: "Live", releaseDate: "2025-12-01", genre: "Electronic" },
  { id: "2", title: "Electric Soul", artist: "Neon Drift", isrc: "USRC12345679", status: "Processing", releaseDate: "2026-01-15", genre: "Pop" },
  { id: "3", title: "Golden Hour", artist: "Solar Flux", isrc: "USRC12345680", status: "Live", releaseDate: "2025-11-20", genre: "Indie" },
  { id: "4", title: "Deep Blue", artist: "Coral Reef", isrc: "USRC12345681", status: "Review", releaseDate: "2026-02-10", genre: "R&B" },
  { id: "5", title: "Neon Lights", artist: "Circuit Break", isrc: "USRC12345682", status: "Draft", releaseDate: "2026-03-01", genre: "Synthwave" },
  { id: "6", title: "Velvet Sky", artist: "Aurora Borealis", isrc: "USRC12345683", status: "Live", releaseDate: "2025-10-05", genre: "Ambient" },
];

// Mock ISRC search results
const mockIsrcResults = [
  { isrc: "USAT21900001", title: "Blinding Lights", artist: "The Weeknd", album: "After Hours" },
  { isrc: "USAT21900002", title: "Save Your Tears", artist: "The Weeknd", album: "After Hours" },
  { isrc: "USUG12000001", title: "Watermelon Sugar", artist: "Harry Styles", album: "Fine Line" },
];

export default function WorksPage() {
  const [search, setSearch] = useState("");
  const [isrcSearch, setIsrcSearch] = useState("");
  const [isrcResults, setIsrcResults] = useState<typeof mockIsrcResults>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const filteredWorks = mockWorks.filter(
    (w) =>
      w.title.toLowerCase().includes(search.toLowerCase()) ||
      w.artist.toLowerCase().includes(search.toLowerCase()) ||
      w.isrc.toLowerCase().includes(search.toLowerCase())
  );

  const handleIsrcSearch = () => {
    if (isrcSearch.trim()) {
      setIsrcResults(mockIsrcResults.filter(
        (r) =>
          r.artist.toLowerCase().includes(isrcSearch.toLowerCase()) ||
          r.title.toLowerCase().includes(isrcSearch.toLowerCase())
      ));
    }
  };

  return (
    <AdminLayout title="Works" subtitle="Manage songs and releases">
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, artist, or ISRC..."
            className="pl-9 bg-secondary border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          {/* ISRC Search Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-border text-foreground hover:bg-secondary">
                <ExternalLink className="h-4 w-4 mr-2" />
                Search ISRC
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display text-foreground">Search ISRC from Spotify</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search artist or track..."
                    className="bg-secondary border-border"
                    value={isrcSearch}
                    onChange={(e) => setIsrcSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleIsrcSearch()}
                  />
                  <Button onClick={handleIsrcSearch} className="gradient-primary text-primary-foreground">
                    Search
                  </Button>
                </div>
                {isrcResults.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {isrcResults.map((result) => (
                      <div
                        key={result.isrc}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{result.title}</p>
                          <p className="text-xs text-muted-foreground">{result.artist} · {result.album}</p>
                        </div>
                        <span className="text-xs font-mono text-primary">{result.isrc}</span>
                      </div>
                    ))}
                  </div>
                )}
                {isrcSearch && isrcResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No results found. Try a different search.</p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Work Dialog */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Add Work
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display text-foreground">Add New Work</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-32 h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-secondary/30">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Cover Art</span>
                    <input type="file" className="hidden" accept="image/*" />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground">Title</Label>
                    <Input className="bg-secondary border-border mt-1" placeholder="Song title" />
                  </div>
                  <div>
                    <Label className="text-foreground">Artist</Label>
                    <Input className="bg-secondary border-border mt-1" placeholder="Artist name" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground">ISRC</Label>
                    <Input className="bg-secondary border-border mt-1" placeholder="USRC12345678" />
                  </div>
                  <div>
                    <Label className="text-foreground">Genre</Label>
                    <Input className="bg-secondary border-border mt-1" placeholder="Electronic" />
                  </div>
                </div>
                <div>
                  <Label className="text-foreground">Release Date</Label>
                  <Input type="date" className="bg-secondary border-border mt-1" />
                </div>
                <div>
                  <Label className="text-foreground">Notes</Label>
                  <Textarea className="bg-secondary border-border mt-1" placeholder="Additional notes..." rows={3} />
                </div>
                <Button className="w-full gradient-primary text-primary-foreground" onClick={() => setAddDialogOpen(false)}>
                  Add Work
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Works Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Song</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Artist</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">ISRC</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Genre</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Release</th>
              <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorks.map((work) => (
              <tr key={work.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                <td className="py-3 px-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <Music className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="font-medium text-foreground text-sm">{work.title}</span>
                  </div>
                </td>
                <td className="py-3 px-5 text-sm text-muted-foreground">{work.artist}</td>
                <td className="py-3 px-5 text-sm font-mono text-muted-foreground">{work.isrc}</td>
                <td className="py-3 px-5 text-sm text-muted-foreground">{work.genre}</td>
                <td className="py-3 px-5 text-sm text-muted-foreground">{work.releaseDate}</td>
                <td className="py-3 px-5">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    work.status === "Live" ? "bg-success/15 text-success"
                    : work.status === "Processing" ? "bg-warning/15 text-warning"
                    : work.status === "Review" ? "bg-accent/15 text-accent"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    {work.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

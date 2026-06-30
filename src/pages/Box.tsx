import { EndlessMode } from '@/components/game/EndlessMode';
import { NavLink } from '@/components/NavLink';
import { Card, CardContent } from '@/components/ui/card';

const Box = () => (
  <div className="min-h-screen bg-background">
    <div className="flex items-center justify-between p-4 bg-muted/50">
      <h1 className="text-lg font-semibold">Pack It, Play It</h1>
      <div className="flex items-center gap-2">
        <NavLink 
          href="/dashboard" 
          className="text-sm hover:underline"
          activeClassName="text-primary"
        >
          Dashboard
        </NavLink>
      </div>
    </div>
    <div className="flex-1 p-4">
      <EndlessMode />
    </div>
  </div>
);

export default Box;

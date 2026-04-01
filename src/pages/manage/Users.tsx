import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { endUsers, teamLeads } from '@/data/mockData';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

const UserManagement: React.FC = () => {
  const allUsers = [...teamLeads, ...endUsers];
  const [search, setSearch] = React.useState('');
  const filtered = allUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.team?.toLowerCase().includes(search.toLowerCase()) ||
    u.persona?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Users & Teams</h1>
            <p className="text-sm text-muted-foreground mt-1">{allUsers.length} users across {new Set(allUsers.map(u => u.team)).size} teams</p>
          </div>
          <button className="px-4 py-2 rounded-lg amp-gradient-primary text-primary-foreground text-sm font-medium">+ Add User</button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search users, teams, personas..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="bg-card border border-border rounded-xl amp-shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Team</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Persona</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase">P</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase">O</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase">C</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Adoption</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Streak</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Risk</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => (
                <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <span className="text-primary-foreground text-[10px] font-semibold">{user.name.split(' ').map(n => n[0]).join('')}</span>
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{user.team}</td>
                  <td className="py-3 px-4 text-muted-foreground">{user.persona}</td>
                  <td className="py-3 px-4 text-center font-semibold text-amp-participation">{user.scores.participation}</td>
                  <td className="py-3 px-4 text-center font-semibold text-amp-ownership">{user.scores.ownership}</td>
                  <td className="py-3 px-4 text-center font-semibold text-amp-confidence">{user.scores.confidence}</td>
                  <td className="py-3 px-4 text-center font-heading font-bold text-amp-adoption">{user.scores.adoption}</td>
                  <td className="py-3 px-4 text-center">{user.streak > 0 ? `🔥 ${user.streak}` : '—'}</td>
                  <td className="py-3 px-4">
                    {user.riskFlags && user.riskFlags.length > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amp-risk/10 text-amp-risk font-medium">{user.riskFlags[0]}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default UserManagement;

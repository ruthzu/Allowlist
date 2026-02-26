import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAllowlist, getStatsForDate, getTrackingState } from '@/lib/storage';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container max-w-3xl py-10 mx-auto space-y-6">
        <Card>
          <CardHeader className="pb-2 flex items-center justify-between">
            <CardTitle className="text-base">Dashboard</CardTitle>
            <Button variant="ghost" onClick={() => window.close()}>Close</Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Tracking view disabled.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;


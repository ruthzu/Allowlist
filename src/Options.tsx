import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from 'lucide-react';

const Options = () => {
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [newDomain, setNewDomain] = useState('');
  const [newLimit, setNewLimit] = useState('');

  useEffect(() => {
    chrome.storage.local.get('limits', (data) => {
      setLimits(data.limits || {});
    });
  }, []);

  const saveLimits = (newLimits: Record<string, number>) => {
    setLimits(newLimits);
    chrome.storage.local.set({ limits: newLimits });
  };

  const addLimit = () => {
    if (newDomain && newLimit) {
      const updated = { ...limits, [newDomain]: parseInt(newLimit) * 60 };
      saveLimits(updated);
      setNewDomain('');
      setNewLimit('');
    }
  };

  const removeLimit = (domain: string) => {
    const updated = { ...limits };
    delete updated[domain];
    saveLimits(updated);
  };

  const clearData = () => {
    if (confirm('确定要清空所有使用统计数据吗？此操作无法恢复。')) {
      chrome.storage.local.set({ stats: {}, notifications: {} });
    }
  };

  return (
    <div className="container max-w-2xl py-10 mx-auto">
      <h1 className="text-3xl font-bold mb-8">WebTime 设置</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>每日时长限制</CardTitle>
            <CardDescription>为特定网站设置每日最长访问时间。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4 items-end">
              <div className="grid gap-2 flex-1">
                <Label htmlFor="domain">网站域名</Label>
                <Input 
                  id="domain" 
                  placeholder="例如 google.com" 
                  value={newDomain} 
                  onChange={(e) => setNewDomain(e.target.value)}
                />
              </div>
              <div className="grid gap-2 w-32">
                <Label htmlFor="limit">限额 (分钟)</Label>
                <Input 
                  id="limit" 
                  type="number" 
                  placeholder="60" 
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                />
              </div>
              <Button onClick={addLimit}>
                <Plus className="h-4 w-4 mr-2" />
                添加限制
              </Button>
            </div>

            <div className="space-y-4">
              {Object.entries(limits).map(([domain, seconds]) => (
                <div key={domain} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="grid gap-1">
                    <span className="font-medium">{domain}</span>
                    <span className="text-sm text-muted-foreground">每日限额：{seconds / 60} 分钟</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeLimit(domain)} title="删除">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {Object.keys(limits).length === 0 && (
                <p className="text-center text-muted-foreground py-4">暂未设置任何限制。</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">危险区域</CardTitle>
            <CardDescription>此操作无法撤销，请谨慎操作。</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={clearData}>清空所有历史数据</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Options;

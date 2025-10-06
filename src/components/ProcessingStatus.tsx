import { Loader2, CheckCircle2, FileSearch, Sparkles } from 'lucide-react';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';

interface ProcessingStatusProps {
  status: 'extracting' | 'ocr' | 'complete';
  progress: number;
}

export const ProcessingStatus = ({ status, progress }: ProcessingStatusProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'extracting':
        return {
          icon: FileSearch,
          text: 'Extracting text from PDF...',
          color: 'text-primary'
        };
      case 'ocr':
        return {
          icon: Sparkles,
          text: 'Running OCR on images...',
          color: 'text-accent'
        };
      case 'complete':
        return {
          icon: CheckCircle2,
          text: 'Processing complete!',
          color: 'text-green-500'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="space-y-4 p-6 bg-card rounded-xl border border-border">
      <div className="flex items-center gap-3">
        {status === 'complete' ? (
          <Icon className={cn("w-6 h-6", config.color)} />
        ) : (
          <Loader2 className={cn("w-6 h-6 animate-spin", config.color)} />
        )}
        <span className="font-medium text-foreground">{config.text}</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
};

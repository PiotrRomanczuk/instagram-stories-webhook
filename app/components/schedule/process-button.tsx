import { useState } from 'react';
import { CheckCircle, Loader } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface ProcessButtonProps {
    onProcessed: () => void;
}

export function ProcessButton({ onProcessed }: ProcessButtonProps) {
    const [processing, setProcessing] = useState(false);

    const handleProcessNow = async () => {
        setProcessing(true);
        try {
            const res = await fetch('/api/schedule/process');
            const data = await res.json();
            if (res.ok) {
                alert(`✅ Processed ${data.processed} post(s)\n${data.succeeded} succeeded, ${data.failed} failed`);
                onProcessed();
            } else {
                alert(`❌ Error: ${data.error}`);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`❌ Error: ${errorMessage}`);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Button
            onClick={handleProcessNow}
            disabled={processing}
            className="bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-sm"
            size="sm"
        >
            {processing ? <><Loader className="w-4 h-4 animate-spin" /> Processing...</> : <><CheckCircle className="w-4 h-4" /> Process Now</>}
        </Button>
    );
}

import { useState } from 'react';
import { CheckCircle, Loader } from 'lucide-react';

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
        } catch (error: any) {
            alert(`❌ Error: ${error.message}`);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <button
            onClick={handleProcessNow}
            disabled={processing}
            className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
        >
            {processing ? <><Loader className="w-4 h-4 animate-spin" /> Processing...</> : <><CheckCircle className="w-4 h-4" /> Process Now</>}
        </button>
    );
}

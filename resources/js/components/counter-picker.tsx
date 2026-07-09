import { Checkbox } from '@/components/ui/checkbox';

type CounterRecord = {
    id: number;
    name: string;
};

type CounterPickerProps = {
    counters: CounterRecord[];
    value: number[];
    onChange: (counterIds: number[]) => void;
    emptyState?: string;
};

export default function CounterPicker({ counters, value, onChange, emptyState = 'No counters are available yet.' }: CounterPickerProps) {
    const toggleCounter = (counterId: number, checked: boolean) => {
        onChange(checked ? [...value, counterId] : value.filter((id) => id !== counterId));
    };

    if (counters.length === 0) {
        return <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{emptyState}</div>;
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {counters.map((counter) => {
                const checked = value.includes(counter.id);

                return (
                    <label
                        key={counter.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                        <Checkbox checked={checked} onCheckedChange={(checkedState) => toggleCounter(counter.id, checkedState === true)} />
                        <span className="text-sm font-medium">{counter.name}</span>
                    </label>
                );
            })}
        </div>
    );
}

// resources/js/pages/orders/payment-modal.tsx

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const PAYMENT_METHODS = ['Cash', 'Visa', 'Master', 'Uber', 'Pickme', 'Bank_Transfer'] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

interface OrderForPayment {
    id: number;
    subtotal: number;
    discount: number;
    total_price: number;
}

interface Props {
    order: OrderForPayment;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface SplitRow {
    method: PaymentMethod;
    amount: string;
}

export default function PaymentModal({ order, open, onOpenChange }: Props) {
    const [ways, setWays] = useState<1 | 2>(1);
    const [discount, setDiscount] = useState(String(order.discount ?? 0));
    const [singleMethod, setSingleMethod] = useState<PaymentMethod>('Cash');
    const [tendered, setTendered] = useState('');
    const [splits, setSplits] = useState<SplitRow[]>([
        { method: 'Cash', amount: '' },
        { method: 'Visa', amount: '' },
    ]);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const total = useMemo(() => {
        const d = parseFloat(discount) || 0;
        return Math.max(0, order.subtotal - d);
    }, [order.subtotal, discount]);

    const tenderedNum = parseFloat(tendered) || 0;
    const balance = tenderedNum - total;

    const splitSum = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    const splitRemaining = total - splitSum;

    const reset = () => {
        setWays(1);
        setDiscount(String(order.discount ?? 0));
        setSingleMethod('Cash');
        setTendered('');
        setSplits([
            { method: 'Cash', amount: '' },
            { method: 'Visa', amount: '' },
        ]);
        setError(null);
    };

    const updateSplit = (index: number, field: keyof SplitRow, value: string) => {
        setSplits((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
    };

    const submit = () => {
        setError(null);

        const payments =
            ways === 1
                ? [
                      {
                          payment_method: singleMethod,
                          amount: singleMethod === 'Cash' ? total.toFixed(2) : total.toFixed(2),
                          amount_tendered: singleMethod === 'Cash' ? (tendered || total.toFixed(2)) : undefined,
                      },
                  ]
                : splits.map((s) => ({
                      payment_method: s.method,
                      amount: (parseFloat(s.amount) || 0).toFixed(2),
                  }));

        if (ways === 1 && singleMethod === 'Cash' && tenderedNum < total) {
            setError(`Amount tendered must be at least Rs. ${total.toFixed(2)}.`);
            return;
        }

        if (ways === 2 && Math.abs(splitSum - total) > 0.01) {
            setError(`Split amounts must add up to Rs. ${total.toFixed(2)}. Currently Rs. ${splitRemaining.toFixed(2)} remaining.`);
            return;
        }

        setProcessing(true);
        router.patch(
            route('orders.process-payment', order.id),
            { discount: parseFloat(discount) || 0, payments },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onOpenChange(false);
                    reset();
                },
                onError: (errors) => {
                    setError(Object.values(errors)[0] as string);
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Take Payment</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Discount (Rs.)</Label>
                        <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-md border p-3">
                        <span className="text-sm text-muted-foreground">Total Due</span>
                        <span className="font-semibold">Rs. {total.toFixed(2)}</span>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Number of Payment Methods</Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={ways === 1 ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setWays(1)}
                            >
                                One
                            </Button>
                            <Button
                                type="button"
                                variant={ways === 2 ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setWays(2)}
                            >
                                Two
                            </Button>
                        </div>
                    </div>

                    {ways === 1 ? (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label>Payment Method</Label>
                                <Select value={singleMethod} onValueChange={(v) => setSingleMethod(v as PaymentMethod)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_METHODS.map((m) => (
                                            <SelectItem key={m} value={m}>
                                                {m.replace('_', ' ')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {singleMethod === 'Cash' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label>Amount Tendered</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={tendered}
                                            onChange={(e) => setTendered(e.target.value)}
                                            placeholder={total.toFixed(2)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Balance to Return</Label>
                                        <Input
                                            readOnly
                                            value={tendered ? Math.max(0, balance).toFixed(2) : '0.00'}
                                            className="bg-muted"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {splits.map((row, i) => (
                                <div key={i} className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label>Method {i + 1}</Label>
                                        <Select
                                            value={row.method}
                                            onValueChange={(v) => updateSplit(i, 'method', v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PAYMENT_METHODS.map((m) => (
                                                    <SelectItem key={m} value={m}>
                                                        {m.replace('_', ' ')}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Amount</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={row.amount}
                                            onChange={(e) => updateSplit(i, 'amount', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                            <p className={`text-sm ${Math.abs(splitRemaining) > 0.01 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                Remaining: Rs. {splitRemaining.toFixed(2)}
                            </p>
                        </div>
                    )}

                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={processing}>
                        {processing ? 'Processing…' : 'Confirm Payment'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

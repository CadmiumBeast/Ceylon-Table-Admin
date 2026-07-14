<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt – {{ $order->order_number }}</title>
    <style>
        @page {
            size: auto;
            margin: 10mm;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            width: 100%;
            max-width: 92mm;
            margin: 0 auto;
            padding: 10mm 8mm;
            color: #111;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .center { text-align: center; }
        .right  { text-align: right; }
        .bold   { font-weight: 700; }

        .invoice-card {
            border: 1px solid #111;
            border-radius: 10px;
            padding: 14px 12px;
        }

        .shop-name {
            font-size: 18px;
            font-weight: 800;
            text-align: center;
            letter-spacing: 0.8px;
            text-transform: uppercase;
        }

        .shop-address {
            font-size: 11px;
            font-weight: 600;
            text-align: center;
            margin-top: 4px;
            line-height: 1.45;
            color: #222;
        }

        .shop-tel {
            font-size: 11px;
            font-weight: 700;
            text-align: center;
            margin-top: 4px;
            color: #111;
        }

        .divider {
            border: none;
            border-top: 1px dashed #444;
            margin: 10px 0;
        }

        .divider-solid {
            border: none;
            border-top: 1px solid #111;
            margin: 10px 0;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 10px;
        }

        .info-box {
            border: 1px solid #d6d6d6;
            border-radius: 8px;
            padding: 6px 8px;
            min-height: 38px;
        }

        .info-label {
            display: block;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #666;
            margin-bottom: 3px;
        }

        .info-value {
            display: block;
            font-size: 12px;
            color: #111;
            line-height: 1.35;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin: 3px 0;
            color: #111;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0 4px;
        }

        .items-table th {
            font-weight: 700;
            text-align: left;
            padding: 6px 0;
            border-bottom: 1px solid #111;
            font-size: 10px;
            color: #111;
        }

        .items-table th.right,
        .items-table td.right {
            text-align: right;
        }

        .items-table td {
            padding: 6px 0;
            vertical-align: top;
            color: #111;
            border-bottom: 1px dotted #ddd;
        }

        .item-name {
            max-width: 2.2in;
            word-break: break-word;
        }

        .totals {
            margin-top: 8px;
        }

        .totals .info-row {
            margin: 4px 0;
        }

        .totals .total-line {
            font-size: 14px;
            font-weight: 800;
            border-top: 1px solid #111;
            border-bottom: 1px solid #111;
            padding: 6px 0;
            margin-top: 6px;
        }

        .payment-badge {
            text-align: center;
            font-size: 12px;
            font-weight: 800;
            margin-top: 10px;
            letter-spacing: 1px;
            padding: 6px 10px;
            border: 1px solid #111;
            border-radius: 999px;
            display: inline-block;
        }

        .footer {
            margin-top: 12px;
            font-size: 10px;
            font-weight: 600;
            text-align: center;
            color: #333;
            line-height: 1.65;
        }

        .meta-title {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #666;
            margin-bottom: 6px;
        }

        .stamp {
            margin-top: 10px;
            text-align: center;
        }

        .stamp span {
            display: inline-block;
            border: 1px solid #111;
            border-radius: 999px;
            padding: 5px 12px;
            font-size: 11px;
            font-weight: 800;
        }

        @media print {
            body {
                max-width: none;
                padding: 0;
                margin: 0;
            }

            .invoice-card {
                border: none;
                border-radius: 0;
                padding: 0;
            }
        }
    </style>
</head>
<body>

    <div class="invoice-card">
        <div class="shop-name">Ceylon Table</div>
        <div class="shop-address">
            83, St Lucias Street, Kotahena,<br>
            Colombo-13
        </div>
        <div class="shop-tel">Tel: 011 234 7777</div>

        <hr class="divider">

        <div class="meta-title">Customer Invoice</div>

        <div class="info-grid">
            <div class="info-box">
                <span class="info-label">Invoice No</span>
                <span class="info-value bold">{{ $order->order_number }}</span>
            </div>
            <div class="info-box">
                <span class="info-label">Date & Time</span>
                <span class="info-value">{{ $order->created_at->format('d M Y, H:i') }}</span>
            </div>
            <div class="info-box">
                <span class="info-label">Order Type</span>
                <span class="info-value" style="text-transform: capitalize;">{{ str_replace('_', ' ', $order->order_type) }}</span>
            </div>
            <div class="info-box">
                <span class="info-label">Table</span>
                <span class="info-value">{{ $order->table?->name ?? 'Takeaway' }}</span>
            </div>
        </div>

        <div style="margin-top: 8px;" class="info-grid">
            <div class="info-box" style="grid-column: span 2;">
                <span class="info-label">Served By</span>
                <span class="info-value">{{ $servedBy ?? 'Staff' }}</span>
            </div>
        </div>

        <hr class="divider">

        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="right">Qty</th>
                    <th class="right">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach($order->items as $orderItem)
                <tr>
                    <td class="item-name">
                        <div class="bold">{{ $orderItem->item?->name ?? '—' }}</div>
                        @if($orderItem->quantity > 1)
                            <div style="font-size:9px; color:#666; margin-top:2px;">Rs. {{ number_format($orderItem->price, 2) }} each</div>
                        @endif
                    </td>
                    <td class="right">{{ $orderItem->quantity }}</td>
                    <td class="right">Rs. {{ number_format($orderItem->price * $orderItem->quantity, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <hr class="divider">

        <div class="totals">
            <div class="info-row">
                <span>Subtotal</span>
                <span>Rs. {{ number_format($order->subtotal, 2) }}</span>
            </div>
            @if($order->discount > 0)
            <div class="info-row" style="color:#0f7a3e;">
                <span>Discount</span>
                <span>- Rs. {{ number_format($order->discount, 2) }}</span>
            </div>
            @endif
            <div class="info-row total-line">
                <span>TOTAL</span>
                <span>Rs. {{ number_format($order->total_price, 2) }}</span>
            </div>
        </div>

        <div class="info-row" style="margin-top: 10px;">
            <span>Payment Method</span>
            <span class="bold">{{ $order->payment_method ? strtoupper($order->payment_method) : 'CASH' }}</span>
        </div>
        <div class="info-row">
            <span>Payment Status</span>
            <span class="bold" style="text-transform: uppercase;">{{ $order->payment_status }}</span>
        </div>

        @if($order->payment_status === 'paid')
            <div class="stamp">
                <span>PAID</span>
            </div>
        @endif

        <hr class="divider-solid">

        <div class="footer">
            Thank you for dining with us.<br>
            Please come again.<br>
            Printed: {{ now()->format('d M Y, H:i') }}
        </div>
    </div>

    <script>
        window.onload = function () {
            window.focus();
            window.print();
            window.onafterprint = function () {
                window.close();
            };
        };
    </script>
</body>
</html>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt – {{ $order->order_number }}</title>
    <style>
        @page {
            size: 3.125in auto;
            margin: 0;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            font-weight: 600;
            width: 3.125in;
            padding: 6mm 4mm;
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .center { text-align: center; }
        .right  { text-align: right; }
        .bold   { font-weight: 800; }

        .shop-name {
            font-size: 16px;
            font-weight: 800;
            text-align: center;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        .shop-address {
            font-size: 10px;
            font-weight: 700;
            text-align: center;
            margin-top: 3px;
            line-height: 1.5;
            color: #000;
        }

        .shop-tel {
            font-size: 10px;
            font-weight: 700;
            text-align: center;
            margin-top: 2px;
            color: #000;
        }

        .divider {
            border: none;
            border-top: 2px dashed #000;
            margin: 5px 0;
        }

        .divider-solid {
            border: none;
            border-top: 2px solid #000;
            margin: 5px 0;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            color: #000;
            font-weight: 600;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 4px 0;
        }

        .items-table th {
            font-weight: 800;
            text-align: left;
            padding: 2px 0;
            border-bottom: 2px dashed #000;
            font-size: 10px;
            color: #000;
        }

        .items-table th.right,
        .items-table td.right {
            text-align: right;
        }

        .items-table td {
            padding: 2px 0;
            vertical-align: top;
            color: #000;
            font-weight: 600;
        }

        .item-name {
            max-width: 1.4in;
            word-break: break-word;
        }

        .totals {
            margin-top: 4px;
        }

        .totals .info-row {
            margin: 3px 0;
        }

        .totals .total-line {
            font-size: 13px;
            font-weight: 800;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 4px 0;
            margin-top: 4px;
        }

        .payment-badge {
            text-align: center;
            font-size: 11px;
            font-weight: 800;
            margin-top: 6px;
            letter-spacing: 0.5px;
        }

        .footer {
            margin-top: 10px;
            font-size: 10px;
            font-weight: 700;
            text-align: center;
            color: #000;
            line-height: 1.7;
        }

        @media print {
            body { padding: 3mm 3mm; }
        }
    </style>
</head>
<body>

    {{-- Business Header --}}
    <div class="shop-name">Ceylon Table</div>
    <div class="shop-address">
        83, St Lucias Street, Kotahena,<br>
        Colombo-13
    </div>
    <div class="shop-tel">Tel: 011 234 7777</div>

    <hr class="divider">

    {{-- Invoice Meta --}}
    <div class="info-row">
        <span>Invoice No</span>
        <span class="bold">{{ $order->order_number }}</span>
    </div>
    <div class="info-row">
        <span>Date & Time</span>
        <span>{{ $order->created_at->format('d M Y  H:i') }}</span>
    </div>
    @if($order->table)
    <div class="info-row">
        <span>Table</span>
        <span class="bold">{{ $order->table->name }}</span>
    </div>
    @endif
    <div class="info-row">
        <span>Type</span>
        <span style="text-transform: capitalize;">{{ $order->order_type }}</span>
    </div>
    @if(isset($servedBy))
    <div class="info-row">
        <span>Served By</span>
        <span>{{ $servedBy }}</span>
    </div>
    @endif

    <hr class="divider">

    {{-- Items Table --}}
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
                <td class="item-name">{{ $orderItem->item?->name ?? '—' }}</td>
                <td class="right">{{ $orderItem->quantity }}</td>
                <td class="right">{{ number_format($orderItem->price * $orderItem->quantity, 2) }}</td>
            </tr>
            {{-- Unit price line if qty > 1 --}}
            @if($orderItem->quantity > 1)
            <tr>
                <td colspan="2" style="font-size:9px; font-weight:700; color:#000; padding-left:4px;">
                    @ Rs. {{ number_format($orderItem->price, 2) }} each
                </td>
                <td></td>
            </tr>
            @endif
            @endforeach
        </tbody>
    </table>

    <hr class="divider">

    {{-- Totals --}}
    <div class="totals">
        <div class="info-row">
            <span>Subtotal</span>
            <span>Rs. {{ number_format($order->subtotal, 2) }}</span>
        </div>
        @if($order->discount > 0)
        <div class="info-row">
            <span>Discount</span>
            <span>- Rs. {{ number_format($order->discount, 2) }}</span>
        </div>
        @endif
        <div class="info-row total-line">
            <span>TOTAL</span>
            <span>Rs. {{ number_format($order->total_price, 2) }}</span>
        </div>
    </div>

    {{-- Payment --}}
    <div class="info-row" style="margin-top: 8px;">
        <span>Payment Method</span>
        <span class="bold">{{ $order->payment_method ? strtoupper($order->payment_method) : 'CASH' }}</span>
    </div>
    @if($order->payment_status === 'paid')
    <div class="payment-badge">*** PAID ***</div>
    @endif

    <hr class="divider">

    {{-- Footer --}}
    <div class="footer">
        Thank you for dining with us!<br>
        Please come again<br><br>
        Printed: {{ now()->format('d M Y H:i') }}
    </div>

    <script>
        window.onload = function () {
            window.print();
            window.onafterprint = function () {
                window.close();
            };
        };
    </script>
</body>
</html>

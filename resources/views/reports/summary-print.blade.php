<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Sales Summary – {{ $dateFrom->format('d M Y') }}</title>
    <style>
        @page {
            size: 3.125in auto;
            margin: 0;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

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
        .bold   { font-weight: 800; }

        .shop-name {
            font-size: 15px;
            font-weight: 800;
            text-align: center;
            letter-spacing: 1px;
        }

        .report-title {
            font-size: 12px;
            font-weight: 800;
            text-align: center;
            margin-top: 4px;
            text-transform: uppercase;
        }

        .range {
            font-size: 9.5px;
            font-weight: 700;
            text-align: center;
            margin-top: 2px;
        }

        .divider { border: none; border-top: 2px dashed #000; margin: 5px 0; }
        .divider-solid { border: none; border-top: 2px solid #000; margin: 5px 0; }

        .row {
            display: flex;
            justify-content: space-between;
            margin: 1.5px 0;
            font-weight: 600;
        }

        .section-title {
            font-size: 10.5px;
            font-weight: 800;
            margin: 6px 0 2px;
            text-transform: uppercase;
        }

        table { width: 100%; border-collapse: collapse; margin: 2px 0; }
        th { text-align: left; font-size: 9.5px; font-weight: 800; border-bottom: 2px dashed #000; padding: 1px 0; }
        th.right, td.right { text-align: right; }
        td { padding: 1px 0; font-size: 10px; font-weight: 600; vertical-align: top; }

        .order-block { margin: 3px 0; padding-bottom: 3px; border-bottom: 1px dotted #999; }
        .order-block .row { font-size: 10px; }

        .total-line {
            font-size: 12px;
            font-weight: 800;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 3px 0;
            margin-top: 3px;
        }

        .footer {
            margin-top: 8px;
            font-size: 9px;
            font-weight: 700;
            text-align: center;
            line-height: 1.5;
        }

        .empty { text-align: center; font-size: 10px; font-weight: 700; margin: 6px 0; }
    </style>
</head>
<body>

    <div class="shop-name">Ceylon Table</div>
    <div class="report-title">Sales Summary</div>
    <div class="range">
        {{ $dateFrom->format('d M Y, h:i A') }}
        {{ $dateFrom->toDateString() !== $dateTo->toDateString() || $dateFrom->format('H:i') !== '00:00' ? '-' : '' }}
        {{ $dateTo->format('d M Y, h:i A') }}
    </div>
    <div class="range">Printed: {{ now()->format('d M Y H:i') }}</div>

    <hr class="divider-solid">

    {{-- KPIs --}}
    <div class="row"><span>Orders</span><span class="bold">{{ $summary['order_count'] }}</span></div>
    <div class="row"><span>Revenue (Paid)</span><span class="bold">Rs. {{ number_format($summary['total_revenue'], 2) }}</span></div>
    @if($summary['total_discount'] > 0)
    <div class="row"><span>Discounts</span><span>Rs. {{ number_format($summary['total_discount'], 2) }}</span></div>
    @endif
    <div class="row"><span>Avg Order Value</span><span>Rs. {{ number_format($summary['average_order_value'], 2) }}</span></div>

    {{-- Status breakdown --}}
    @if(count($summary['status_breakdown']))
    <div class="section-title">By Status</div>
    @foreach($summary['status_breakdown'] as $s)
    <div class="row"><span style="text-transform:capitalize;">{{ $s['status'] }}</span><span>{{ $s['count'] }}</span></div>
    @endforeach
    @endif

    {{-- Type breakdown --}}
    @if(count($summary['type_breakdown']))
    <div class="section-title">By Order Type</div>
    @foreach($summary['type_breakdown'] as $t)
    <div class="row"><span style="text-transform:capitalize;">{{ $t['type'] }}</span><span>{{ $t['count'] }} / Rs. {{ number_format($t['total'], 2) }}</span></div>
    @endforeach
    @endif

    {{-- Payment breakdown --}}
    @if(count($summary['payment_breakdown']))
    <div class="section-title">By Payment</div>
    @foreach($summary['payment_breakdown'] as $p)
    <div class="row"><span style="text-transform:capitalize;">{{ $p['method'] }}</span><span>{{ $p['count'] }} / Rs. {{ number_format($p['total'], 2) }}</span></div>
    @endforeach
    @endif

    {{-- Items sold --}}
    @if(count($summary['item_breakdown']))
    <hr class="divider">
    <div class="section-title">Items Sold ({{ count($summary['item_breakdown']) }})</div>
    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th class="right">Qty</th>
                <th class="right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($summary['item_breakdown'] as $item)
            <tr>
                <td>{{ $item['name'] }}</td>
                <td class="right">{{ $item['quantity'] }}</td>
                <td class="right">{{ number_format($item['total'], 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- Orders list --}}
    <hr class="divider">
    <div class="section-title">Orders ({{ count($summary['orders']) }})</div>

    @forelse($summary['orders'] as $o)
    <div class="order-block">
        <div class="row">
            <span class="bold">{{ $o['order_number'] }}</span>
            <span>{{ \Carbon\Carbon::parse($o['created_at'])->format('d M H:i') }}</span>
        </div>
        <div class="row">
            <span style="text-transform:capitalize;">{{ $o['order_type'] }}{{ $o['table'] ? ' · ' . $o['table'] : '' }}</span>
            <span style="text-transform:capitalize;">{{ $o['order_status'] }}</span>
        </div>
        <div class="row">
            <span style="text-transform:capitalize;">{{ $o['payment_status'] }}{{ $o['payment_method'] ? ' (' . strtoupper($o['payment_method']) . ')' : '' }}</span>
            <span class="bold">Rs. {{ number_format($o['total_price'], 2) }}</span>
        </div>
    </div>
    @empty
    <div class="empty">No orders in this range.</div>
    @endforelse

    <div class="total-line row">
        <span>TOTAL REVENUE</span>
        <span>Rs. {{ number_format($summary['total_revenue'], 2) }}</span>
    </div>

    <div class="footer">
        Ceylon Table — Sales Summary Report<br>
        End of report
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

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Shift Report – #{{ $shift->id }}</title>
    <style>
        @page { size: 3.125in auto; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
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
            font-size: 19px;
            font-weight: 800;
            text-align: center;
            letter-spacing: 1px;
        }

        .report-title {
            font-size: 14px;
            font-weight: 800;
            text-align: center;
            margin-top: 4px;
            text-transform: uppercase;
        }

        .range {
            font-size: 11px;
            font-weight: 700;
            text-align: center;
            margin-top: 2px;
        }

        .divider { border: none; border-top: 2px dashed #000; margin: 5px 0; }
        .divider-solid { border: none; border-top: 2px solid #000; margin: 5px 0; }

        .row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            font-weight: 600;
        }

        .section-title {
            font-size: 12px;
            font-weight: 800;
            margin: 6px 0 2px;
            text-transform: uppercase;
        }

        table { width: 100%; border-collapse: collapse; margin: 2px 0; }
        th { text-align: left; font-size: 11px; font-weight: 800; border-bottom: 2px dashed #000; padding: 2px 0; }
        th.right, td.right { text-align: right; }
        td { padding: 2px 0; font-size: 12px; font-weight: 600; vertical-align: top; }

        .order-block { margin: 3px 0; padding-bottom: 3px; border-bottom: 1px dotted #999; }
        .order-block .row { font-size: 12px; }

        .total-line {
            font-size: 14px;
            font-weight: 800;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 4px 0;
            margin-top: 3px;
        }

        .footer {
            margin-top: 8px;
            font-size: 11px;
            font-weight: 700;
            text-align: center;
            line-height: 1.5;
        }

        .empty { text-align: center; font-size: 12px; font-weight: 700; margin: 6px 0; }
    </style>
</head>
<body>

    <div class="shop-name">Ceylon Table</div>
    <div class="report-title">
        @switch($type)
            @case('total') Total Sales @break
            @case('category') Category Wise @break
            @case('discount') Discount Wise @break
            @case('table') Table Wise @break
            @case('item') Item Wise @break
            @case('order') Order Wise @break
            @case('hourly') Hourly Sales @break
        @endswitch
    </div>
    <div class="range">Shift #{{ $shift->id }}</div>
    <div class="range">
        {{ \Carbon\Carbon::parse($shift->opened_at)->format('d M Y, h:i A') }}
        &ndash;
        {{ $shift->closed_at ? \Carbon\Carbon::parse($shift->closed_at)->format('d M Y, h:i A') : 'Now' }}
    </div>
    <div class="range">Printed: {{ now()->format('d M Y H:i') }}</div>

    <hr class="divider-solid">

    @switch($type)

        {{-- TOTAL SALES --}}
        @case('total')
            <div class="row"><span>Total Orders</span><span class="bold">{{ $data['total_orders'] }}</span></div>
            <div class="row"><span>Gross Sales</span><span>Rs. {{ number_format($data['gross_sales'], 2) }}</span></div>
            @if($data['total_discount'] > 0)
            <div class="row"><span>Discounts</span><span>Rs. {{ number_format($data['total_discount'], 2) }}</span></div>
            @endif
            <div class="row"><span>Cash</span><span>Rs. {{ number_format($data['cash'], 2) }}</span></div>
            <div class="row"><span>Card</span><span>Rs. {{ number_format($data['card'], 2) }}</span></div>
            @if($data['other'] > 0)
            <div class="row"><span>Other</span><span>Rs. {{ number_format($data['other'], 2) }}</span></div>
            @endif
            <div class="row"><span>Avg Order Value</span><span>Rs. {{ number_format($data['average_order_value'], 2) }}</span></div>
            <div class="total-line row">
                <span>NET SALES</span>
                <span>Rs. {{ number_format($data['net_sales'], 2) }}</span>
            </div>
            @break

        {{-- CATEGORY WISE --}}
        @case('category')
            @if(count($data))
            <table>
                <thead><tr><th>Category</th><th class="right">Qty</th><th class="right">Revenue</th></tr></thead>
                <tbody>
                @foreach($data as $row)
                    <tr>
                        <td>{{ $row['category'] }}</td>
                        <td class="right">{{ $row['qty_sold'] }}</td>
                        <td class="right">{{ number_format($row['revenue'], 2) }}</td>
                    </tr>
                @endforeach
                </tbody>
            </table>
            @else
            <div class="empty">No category data for this shift.</div>
            @endif
            @break

        {{-- DISCOUNT WISE --}}
        @case('discount')
            <div class="row"><span>Total Discount</span><span class="bold">Rs. {{ number_format($data['total_discount_given'], 2) }}</span></div>
            <div class="row"><span>Discounted Orders</span><span>{{ $data['discounted_orders_count'] }}</span></div>
            <hr class="divider">
            @forelse($data['orders'] as $o)
            <div class="order-block">
                <div class="row"><span class="bold">{{ $o['order_number'] }}</span><span>{{ $o['table'] ?? '—' }}</span></div>
                <div class="row"><span>Subtotal</span><span>{{ number_format($o['subtotal'], 2) }}</span></div>
                <div class="row"><span>Discount</span><span>-{{ number_format($o['discount'], 2) }}</span></div>
                <div class="row"><span class="bold">Total</span><span class="bold">{{ number_format($o['total'], 2) }}</span></div>
            </div>
            @empty
            <div class="empty">No discounted orders.</div>
            @endforelse
            @break

        {{-- TABLE WISE --}}
        @case('table')
            @if(count($data))
            <table>
                <thead><tr><th>Table</th><th class="right">Orders</th><th class="right">Sales</th></tr></thead>
                <tbody>
                @foreach($data as $row)
                    <tr>
                        <td>{{ $row['table'] }}</td>
                        <td class="right">{{ $row['orders'] }}</td>
                        <td class="right">{{ number_format($row['total_sales'], 2) }}</td>
                    </tr>
                @endforeach
                </tbody>
            </table>
            @else
            <div class="empty">No table data for this shift.</div>
            @endif
            @break

        {{-- ITEM WISE --}}
        @case('item')
            @if(count($data))
            <table>
                <thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Revenue</th></tr></thead>
                <tbody>
                @foreach($data as $row)
                    <tr>
                        <td>{{ $row['item_name'] }}</td>
                        <td class="right">{{ $row['qty_sold'] }}</td>
                        <td class="right">{{ number_format($row['revenue'], 2) }}</td>
                    </tr>
                @endforeach
                </tbody>
            </table>
            @else
            <div class="empty">No items sold this shift.</div>
            @endif
            @break

        {{-- ORDER WISE --}}
        @case('order')
            @forelse($data as $o)
            <div class="order-block">
                <div class="row">
                    <span class="bold">{{ $o['order_number'] }}</span>
                    <span>{{ $o['time'] }}</span>
                </div>
                <div class="row">
                    <span style="text-transform:capitalize;">{{ $o['order_type'] }}{{ $o['table'] ? ' · ' . $o['table'] : '' }}</span>
                    <span>{{ $o['items_count'] }} items</span>
                </div>
                <div class="row">
                    <span style="text-transform:capitalize;">{{ $o['payment_method'] ?? 'unpaid' }}</span>
                    <span class="bold">Rs. {{ number_format($o['total'], 2) }}</span>
                </div>
            </div>
            @empty
            <div class="empty">No orders this shift.</div>
            @endforelse
            @break

        {{-- HOURLY SALES --}}
        @case('hourly')
            @if(count($data))
            <table>
                <thead><tr><th>Hour</th><th class="right">Orders</th><th class="right">Sales</th></tr></thead>
                <tbody>
                @foreach($data as $row)
                    <tr>
                        <td>{{ $row['hour'] }}</td>
                        <td class="right">{{ $row['orders'] }}</td>
                        <td class="right">{{ number_format($row['total_sales'], 2) }}</td>
                    </tr>
                @endforeach
                </tbody>
            </table>
            @else
            <div class="empty">No sales this shift.</div>
            @endif
            @break

    @endswitch

    <div class="footer">
        Ceylon Table — Shift Report<br>
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

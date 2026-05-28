import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';
import '../widgets/status_badge.dart';

class AssetDetailScreen extends StatefulWidget {
  final String assetId;
  const AssetDetailScreen({super.key, required this.assetId});

  @override
  State<AssetDetailScreen> createState() => _AssetDetailScreenState();
}

class _AssetDetailScreenState extends State<AssetDetailScreen> {
  Map<String, dynamic>? _asset;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiService.instance.getAsset(widget.assetId);
      if (mounted) setState(() => _asset = data);
    } catch (_) {} finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _fmt(double v) => NumberFormat.currency(locale: 'fr_FR', symbol: 'FCFA', decimalDigits: 0).format(v);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_asset?['name'] ?? 'Bien')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _asset == null
              ? const Center(child: Text('Bien introuvable'))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(padding: const EdgeInsets.all(16), children: [
                    // Header card
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                          Text(_asset!['name'] as String,
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                          StatusBadge(_asset!['status'] as String),
                        ]),
                        const SizedBox(height: 4),
                        Text(_asset!['category'] as String,
                            style: const TextStyle(color: Color(0xFF94A3B8))),
                      ]),
                    ),
                    const SizedBox(height: 12),

                    // Valeurs comptables
                    _InfoCard(title: 'Données comptables', children: [
                      _InfoRow('Prix d\'achat', _fmt((_asset!['purchasePrice'] as num).toDouble())),
                      _InfoRow('VNC', _fmt((_asset!['netBookValue'] as num).toDouble()),
                          valueColor: AppTheme.success),
                      _InfoRow('Durée amortissement', '${_asset!['depreciationYears']} ans'),
                    ]),
                    const SizedBox(height: 12),

                    // Tags
                    if ((_asset!['tags'] as List?)?.isNotEmpty == true) ...[
                      _InfoCard(title: 'Tags associés', children: [
                        for (final tag in (_asset!['tags'] as List))
                          _InfoRow(
                            (tag as Map)['tagType'] as String,
                            tag['hardwareId'] as String,
                            icon: _tagIcon(tag['tagType'] as String),
                          ),
                      ]),
                      const SizedBox(height: 12),
                    ],

                    // Historique localisations
                    if ((_asset!['locationHistory'] as List?)?.isNotEmpty == true)
                      _InfoCard(title: 'Dernières positions', children: [
                        for (final loc in (_asset!['locationHistory'] as List).take(5))
                          _InfoRow(
                            (loc as Map)['siteName'] as String,
                            '${loc['latitude']?.toStringAsFixed(4)}, ${loc['longitude']?.toStringAsFixed(4)}',
                            icon: Icons.location_on_outlined,
                          ),
                      ]),
                  ]),
                ),
    );
  }

  IconData _tagIcon(String type) => switch (type) {
    'QR' => Icons.qr_code,
    'RFID' => Icons.wifi,
    'BLE' => Icons.bluetooth,
    'GPS' => Icons.gps_fixed,
    _ => Icons.label,
  };
}

class _InfoCard extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _InfoCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppTheme.surface,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AppTheme.border),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF94A3B8), fontSize: 12)),
      const SizedBox(height: 12),
      ...children,
    ]),
  );
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final IconData? icon;
  const _InfoRow(this.label, this.value, {this.valueColor, this.icon});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(children: [
      if (icon != null) ...[Icon(icon, size: 16, color: const Color(0xFF64748B)), const SizedBox(width: 8)],
      Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
      const Spacer(),
      Text(value, style: TextStyle(fontWeight: FontWeight.w600, color: valueColor ?? Colors.white, fontSize: 14)),
    ]),
  );
}

import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/sync_service.dart';

class OfflineBanner extends StatefulWidget {
  const OfflineBanner({super.key});

  @override
  State<OfflineBanner> createState() => _OfflineBannerState();
}

class _OfflineBannerState extends State<OfflineBanner> {
  bool _isOnline = true;
  int _pending = 0;

  @override
  void initState() {
    super.initState();
    _refresh();
    Connectivity().onConnectivityChanged.listen((_) => _refresh());
  }

  Future<void> _refresh() async {
    final result = await Connectivity().checkConnectivity();
    final online = result.any((r) => r != ConnectivityResult.none);
    final pending = await SyncService.instance.pendingCount();
    if (mounted) setState(() { _isOnline = online; _pending = pending; });
  }

  @override
  Widget build(BuildContext context) {
    if (_isOnline && _pending == 0) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: _isOnline ? AppTheme.warning.withOpacity(0.15) : AppTheme.danger.withOpacity(0.15),
      child: Row(children: [
        Icon(_isOnline ? Icons.sync : Icons.wifi_off, size: 16,
            color: _isOnline ? AppTheme.warning : AppTheme.danger),
        const SizedBox(width: 8),
        Text(
          _isOnline
              ? 'Synchronisation de $_pending scan(s)…'
              : 'Hors ligne — $_pending scan(s) en attente',
          style: TextStyle(
            fontSize: 12,
            color: _isOnline ? AppTheme.warning : AppTheme.danger,
          ),
        ),
      ]),
    );
  }
}

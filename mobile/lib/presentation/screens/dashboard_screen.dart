import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import '../../core/services/sync_service.dart';
import '../widgets/offline_banner.dart';
import '../../core/theme/app_theme.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _pendingCount = 0;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    final count = await SyncService.instance.pendingCount();
    if (mounted) setState(() => _pendingCount = count);
  }

  Future<void> _logout() async {
    await const FlutterSecureStorage().delete(key: 'jwt_token');
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventaire'),
        actions: [
          IconButton(icon: const Icon(Icons.logout), onPressed: _logout, tooltip: 'Déconnexion'),
        ],
      ),
      body: Column(children: [
        const OfflineBanner(),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              // Scanner principal — bouton terrain large
              _BigActionCard(
                icon: Icons.qr_code_scanner,
                label: 'Scanner un tag',
                subtitle: 'QR · NFC · Saisie manuelle',
                color: AppTheme.primary,
                onTap: () => context.push('/scanner'),
              ),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: _SmallActionCard(
                    icon: Icons.inventory_2_outlined,
                    label: 'Biens',
                    onTap: () => context.push('/assets'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _SmallActionCard(
                    icon: Icons.add_box_outlined,
                    label: 'Enrôler',
                    onTap: () => context.push('/enroll'),
                  ),
                ),
              ]),
              if (_pendingCount > 0) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.warning.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.warning.withOpacity(0.3)),
                  ),
                  child: Row(children: [
                    const Icon(Icons.pending_actions, color: AppTheme.warning),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('$_pendingCount scan(s) hors ligne',
                          style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.warning)),
                      const Text('Seront synchronisés dès la reconnexion',
                          style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                    ])),
                  ]),
                ),
              ],
            ]),
          ),
        ),
      ]),
    );
  }
}

class _BigActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _BigActionCard({required this.icon, required this.label, required this.subtitle, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(16),
    child: Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: color.withOpacity(0.2), shape: BoxShape.circle),
          child: Icon(icon, color: color, size: 32),
        ),
        const SizedBox(width: 16),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          Text(subtitle, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
        ]),
        const Spacer(),
        Icon(Icons.chevron_right, color: color),
      ]),
    ),
  );
}

class _SmallActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _SmallActionCard({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(16),
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(children: [
        Icon(icon, color: Colors.white70, size: 28),
        const SizedBox(height: 8),
        Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
      ]),
    ),
  );
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/services/api_service.dart';
import '../../core/theme/app_theme.dart';
import '../widgets/status_badge.dart';
import '../widgets/offline_banner.dart';

class AssetsListScreen extends StatefulWidget {
  const AssetsListScreen({super.key});

  @override
  State<AssetsListScreen> createState() => _AssetsListScreenState();
}

class _AssetsListScreenState extends State<AssetsListScreen> {
  List<Map<String, dynamic>> _assets = [];
  List<Map<String, dynamic>> _filtered = [];
  bool _loading = true;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final raw = await ApiService.instance.getAssets();
      final list = raw.cast<Map<String, dynamic>>();
      if (mounted) setState(() { _assets = list; _applyFilter(); });
    } catch (_) {
      if (mounted) setState(() => _assets = []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _applyFilter() {
    final q = _search.toLowerCase();
    _filtered = _assets.where((a) {
      return (a['name'] as String).toLowerCase().contains(q) ||
          (a['category'] as String).toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Biens'), actions: [
        IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
      ]),
      body: Column(children: [
        const OfflineBanner(),
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            onChanged: (v) => setState(() { _search = v; _applyFilter(); }),
            decoration: const InputDecoration(
              hintText: 'Rechercher par nom ou catégorie…',
              prefixIcon: Icon(Icons.search),
              isDense: true,
            ),
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _filtered.isEmpty
                      ? const Center(child: Text('Aucun bien trouvé',
                          style: TextStyle(color: Color(0xFF64748B))))
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                          itemCount: _filtered.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (_, i) {
                            final a = _filtered[i];
                            return InkWell(
                              onTap: () => context.push('/assets/${a['id']}'),
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppTheme.surface,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: AppTheme.border),
                                ),
                                child: Row(children: [
                                  Container(
                                    width: 44, height: 44,
                                    decoration: BoxDecoration(
                                      color: AppTheme.primary.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Icon(Icons.inventory_2_outlined,
                                        color: AppTheme.primary, size: 22),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start, children: [
                                      Text(a['name'] as String,
                                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                                          overflow: TextOverflow.ellipsis),
                                      Text(a['category'] as String,
                                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                                    ],
                                  )),
                                  StatusBadge(a['status'] as String),
                                ]),
                              ),
                            );
                          },
                        ),
                ),
        ),
      ]),
    );
  }
}

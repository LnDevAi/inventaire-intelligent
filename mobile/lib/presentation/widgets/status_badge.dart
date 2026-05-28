import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge(this.status, {super.key});

  static const _labels = {
    'ACTIVE': 'Actif', 'IN_MAINTENANCE': 'Maintenance',
    'DISPOSED': 'Cédé', 'LOST': 'Perdu', 'STOLEN': 'Volé',
  };

  Color _color() => switch (status) {
    'ACTIVE' => AppTheme.success,
    'IN_MAINTENANCE' => AppTheme.warning,
    'LOST' || 'STOLEN' => AppTheme.danger,
    _ => Colors.grey,
  };

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: _color().withOpacity(0.15),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: _color().withOpacity(0.4)),
    ),
    child: Text(_labels[status] ?? status,
        style: TextStyle(color: _color(), fontSize: 12, fontWeight: FontWeight.w600)),
  );
}

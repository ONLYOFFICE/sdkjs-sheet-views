/*
 * (c) Copyright Ascensio System SIA 2010-2019
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 20A-12 Ernesta Birznieka-Upisha
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

"use strict";

(function (undefined) {

	// 1. интерфейс
	// asc_addNamedSheetView - создание нового вью и дублирование текущего.
	// лочим созднанный лист, проверяем лок менеджера. при принятии лока другими пользователями - лочится менеджер.
	// для добавления в историю используем historyitem_Worksheet_SheetViewAdd, в историю кладём весь объект.

	// asc_getNamedSheetViews - отдаём массив отображений активного листа
	// asc_getActiveNamedSheetView - отдаём имя активного листа

	// asc_deleteNamedSheetViews - удаление массива отображений. лочим удаляемое отображение.
	// в данном случае(как и в именованных диапазонах) у других пользователей нельзя добавить новое отображение. Удалить другие можно.
	// для истории при удалении использую UndoRedoData_NamedSheetViewRedo, потому что весь объект необходим только при undo, пересылать его не нужно.

	// asc_setActiveNamedSheetView - выставление активного отображения. ничего не лочим. внутри функции описана процедура взаимодействия со скрытыми строками при переходе между вью.

	// 1.1 Ограничения строгого совместного редактирования:
	// 	- Локи работают следующим образом: при переходе между вью локов нет. при примении а/ф в режиме вью ничего не лочится.
	// - при взаимных изменениях с одним а/ф, применяем тот а/ф, который был последним сохраненным.
	// - при скрытии строк в режиме дефолт - лочится лист, но в режиме вью можно использовать а/ф для скрытия строчек, скрывать строки через контекстное меню после скрытия строк в дефолте - нельзя.
	// - при добавлении нового вью - лочим менеджер
	// - при удалении вью - лочим менеджер. но при удалении не проверяем залочен ли менеджер. проверяем только залоченность конкретного вью.
	// - при переименовании - лочим менеджер

	// 2. служебные функции в приватном апи
	// _isLockedNamedSheetView - проверка лока массива отображений
	// _onUpdateNamedSheetViewLock - вызывается из onLocksAcquired, добавляем информацию о локах
	// _onUpdateAllSheetViewLock - снимаем локи со всех листов и отображний. !!! вызывается через "updateAllSheetViewLock"(пересмотреть). возможно, необходимо добавить вызов в onLocksReleased !!!
	// 	isNamedSheetViewManagerLocked - проверка лока листа. !!! храним в прототипе апи - sheetViewManagerLocks. пересмореть!!!
	// 	updateAllFilters


	var prot;
	var asc = window["Asc"];
	var c_oAscError = asc.c_oAscError;
	var CT_NamedSheetView = window['Asc'].CT_NamedSheetView;
	var CT_NsvFilter = window['Asc'].CT_NsvFilter;
	var CT_ColumnFilter = window['Asc'].CT_ColumnFilter;
	var CT_SortRule = window['Asc'].CT_SortRule;
	var History = AscCommon.History;

	if (!CT_NamedSheetView || !CT_NsvFilter || !CT_ColumnFilter || !CT_SortRule) {
		return;
	}

	CT_NamedSheetView.prototype.asc_getName = function () {
		return this.name;
	};

	CT_NamedSheetView.prototype.asc_setName = function (val) {
		var t = this;
		var api = window["Asc"]["editor"];
		if (this.name !== val) {
			if (api.isNamedSheetViewManagerLocked(t.ws.getId())) {
				t.ws.workbook.handlers.trigger("asc_onError", c_oAscError.ID.LockedEditView, c_oAscError.Level.NoCritical);
				return;
			}

			api._isLockedNamedSheetView([t], function(success) {
				if (!success) {
					t.ws.workbook.handlers.trigger("asc_onError", c_oAscError.ID.LockedEditView, c_oAscError.Level.NoCritical);
					return;
				}

				History.Create_NewPoint();
				History.StartTransaction();

				var oldVal = t.name;
				t.setName(val);

				History.Add(AscCommonExcel.g_oUndoRedoNamedSheetViews, AscCH.historyitem_NamedSheetView_SetName,
					t.ws.getId(), null, new AscCommonExcel.UndoRedoData_NamedSheetView(t.Id, oldVal, val));

				History.EndTransaction();

				api.handlers.trigger("asc_onRefreshNamedSheetViewList", t.ws.index);
			});
		}
	};

	CT_NamedSheetView.prototype.setName = function (val) {
		this.name = val;
	};


	CT_NamedSheetView.prototype.asc_getIsActive = function () {
		return this._isActive;
	};

	CT_NamedSheetView.prototype.generateName = function () {
		var ws = this.ws;
		if (!ws) {
			return;
		}

		var mapNames = [], isContains, name = this.name;
		for (var i = 0; i < ws.aNamedSheetViews.length; i++) {
			if (name && name === ws.aNamedSheetViews[i].name) {
				isContains = true;
			}
			mapNames[ws.aNamedSheetViews[i].name] = 1;
		}

		var baseName, counter;
		if (!name) {
			//TODO перевод
			name = "View";

			baseName = name;
			counter = 1;
			while (mapNames[baseName + counter]) {
				counter++;
			}
			name = baseName + counter;
		} else if (isContains) {
			//так делаяем при создании дубликата
			baseName = name + " ";
			counter = 2;
			while (mapNames[baseName + "(" + counter + ")"]) {
				counter++;
			}
			name = baseName + "(" + counter + ")";
		}

		return name;
	};

	CT_NamedSheetView.prototype.asc_getIsLock = function () {
		return this.isLock;
	};

	CT_NamedSheetView.prototype.addFilter = function (filter) {
		var nsvFilter = new CT_NsvFilter();
		nsvFilter.init(filter);
		this.nsvFilters.push(nsvFilter);
		//TODO history

	};

	CT_NamedSheetView.prototype.deleteFilter = function (filter) {
		if (!this.nsvFilters || !this.nsvFilters.length || !filter) {
			return;
		}

		for (var i = 0; i < this.nsvFilters.length; i++) {
			var isAutoFilter = filter.isAutoFilter();
			var isDelete = false;
			if (isAutoFilter && this.nsvFilters[i].tableId === "0") {
				isDelete = true;
			} else if (!isAutoFilter && this.nsvFilters[i].tableId === filter.DisplayName) {
				isDelete = true;
			}

			if (isDelete) {
				var historyFilter = this.nsvFilters[i].clone();
				this.nsvFilters.splice(i, 1);
				History.Add(AscCommonExcel.g_oUndoRedoNamedSheetViews, AscCH.historyitem_NamedSheetView_DeleteFilter,
					this.ws.getId(), null, new AscCommonExcel.UndoRedoData_NamedSheetViewRedo(this.Id, historyFilter, null));
				break;
			}
		}
	};

	CT_NamedSheetView.prototype.getNsvFiltersByTableId = function (val) {
		if (!this.nsvFilters) {
			return null;
		}
		if (!val) {
			val = "0";
		}
		for (var i = 0; i < this.nsvFilters.length; i++) {
			if (this.nsvFilters[i].tableId === val) {
				return this.nsvFilters[i];
			}
		}
		return null;
	};

	CT_NamedSheetView.prototype.Write_ToBinary2 = function (writer) {
		//for wrapper
		writer.WriteLong(this.getObjectType());

		writer.WriteLong(this.nsvFilters ? this.nsvFilters.length : 0);

		if (this.nsvFilters) {
			for(var i = 0, length = this.nsvFilters.length; i < length; ++i) {
				this.nsvFilters[i].Write_ToBinary2(writer);
			}
		}

		writer.WriteString2(this.name);
		writer.WriteString2(this.id);
	};

	CT_NsvFilter.prototype.Write_ToBinary2 = function (writer) {
		writer.WriteLong(this.columnsFilter ? this.columnsFilter.length : 0);

		var i, length;
		if (this.columnsFilter) {
			for(i = 0, length = this.columnsFilter.length; i < length; ++i) {
				this.columnsFilter[i].Write_ToBinary2(writer);
			}
		}

		writer.WriteLong(this.sortRules ? this.sortRules.length : 0);

		if (this.sortRules) {
			for(i = 0, length = this.sortRules.length; i < length; ++i) {
				this.sortRules[i].Write_ToBinary2(writer);
			}
		}

		writer.WriteString2(this.filterId);

		if (null != this.Ref) {
			writer.WriteBool(true);
			writer.WriteLong(this.Ref.r1);
			writer.WriteLong(this.Ref.c1);
			writer.WriteLong(this.Ref.r2);
			writer.WriteLong(this.Ref.c2);
		} else {
			writer.WriteBool(false);
		}

		if (null != this.tableId) {
			writer.WriteBool(true);
			writer.WriteString2(this.tableId);
		} else {
			writer.WriteBool(false);
		}

		if (null != this.tableIdOpen) {
			writer.WriteBool(true);
			writer.WriteString2(this.tableIdOpen);
		} else {
			writer.WriteBool(false);
		}
	};
	CT_ColumnFilter.prototype.Write_ToBinary2 = function (writer) {
		if(null != this.dxf) {
			var dxf = this.dxf;
			writer.WriteBool(true);
			var oBinaryStylesTableWriter = new AscCommonExcel.BinaryStylesTableWriter(writer);
			oBinaryStylesTableWriter.bs.WriteItem(0, function(){oBinaryStylesTableWriter.WriteDxf(dxf);});
		}else {
			writer.WriteBool(false);
		}

		if(null != this.filter) {
			writer.WriteBool(true);
			this.filter.Write_ToBinary2(writer);
		} else {
			writer.WriteBool(false);
		}
		//?
		/*	this.colId = null;
		this.id = null;*/
	};
	CT_SortRule.prototype.Write_ToBinary2 = function (writer) {
		if(null != this.dxf) {
			var dxf = this.dxf;
			writer.WriteBool(true);
			var oBinaryStylesTableWriter = new AscCommonExcel.BinaryStylesTableWriter(writer);
			oBinaryStylesTableWriter.bs.WriteItem(0, function(){oBinaryStylesTableWriter.WriteDxf(dxf);});
		}else {
			writer.WriteBool(false);
		}

		if(null != this.sortCondition) {
			writer.WriteBool(true);
			this.sortCondition.Write_ToBinary2(writer);
		} else {
			writer.WriteBool(false);
		}

		if(null != this.richSortCondition) {
			writer.WriteBool(true);
			this.richSortCondition.Write_ToBinary2(writer);
		} else {
			writer.WriteBool(false);
		}
	};


	prot = CT_NamedSheetView.prototype;
	prot["asc_getName"] = prot.asc_getName;
	prot["asc_setName"] = prot.asc_setName;
	prot["asc_getIsActive"] = prot.asc_getIsActive;
	prot["asc_setIsActive"] = prot.asc_setIsActive;
	prot["asc_getIsLock"] = prot.asc_getIsLock;

})(window);

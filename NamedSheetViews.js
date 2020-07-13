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

	var prot;
	var CT_NamedSheetView = window['Asc'].CT_NamedSheetView;
	var CT_NsvFilter = window['Asc'].CT_NsvFilter;
	var CT_ColumnFilter = window['Asc'].CT_ColumnFilter;
	var CT_SortRule = window['Asc'].CT_SortRule;

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
			api._isLockedNamedSheetView([t], function(success) {
				if (!success) {
					return;
				}

				History.Create_NewPoint();
				History.StartTransaction();

				var oldVal = t.name;
				t.name = val;

				/*History.Add(AscCommonExcel.g_oUndoRedoNamedSheetViews, AscCH.historyitem_NamedSheetView_SetName,
					t.ws ? t.ws.getId() : null, null,
					new AscCommonExcel.UndoRedoData_NamedSheetView(null, oldVal, val));*/

				History.EndTransaction();

				api.handlers.trigger("asc_onRefreshNamedSheetViewList", t.ws.index);
			});
		}
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
				this.nsvFilters.splice(i, 1);
				//TODO history
				break;
			}
		}
	};

	CT_NamedSheetView.prototype.getNsvFiltersByTableId = function (val) {
		if (!this.nsvFilters) {
			return null;
		}
		for (var i = 0; i < this.nsvFilters.length; i++) {
			if (this.nsvFilters[i].tableId === val) {
				return this.nsvFilters[i];
			}
		}
		return null;
	};

	prot = CT_NamedSheetView.prototype;
	prot["asc_getName"] = prot.asc_getName;
	prot["asc_getIsActive"] = prot.asc_getIsActive;
	prot["asc_setIsActive"] = prot.asc_setIsActive;
	prot["asc_getIsLock"] = prot.asc_getIsLock;

})(window);